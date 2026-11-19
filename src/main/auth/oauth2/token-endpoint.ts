import { RequestFailed } from "../../errors";
import { sendFollowingRedirects } from "../../http/follow-redirects";
import type { NetworkPlan } from "../../network/network-plan";
import { isLoopbackOrHttps } from "./oauth2-urls";
import type { StoredToken } from "./token-store";

const MAX_TOKEN_RESPONSE_BYTES = 1024 * 1024;

export interface TokenRequest {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  /** grant_type and its parameters. */
  form: Record<string, string>;
  network: NetworkPlan;
}

export interface TokenResult {
  token: StoredToken;
  idToken: string | undefined;
}

/** POSTs to the token endpoint (RFC 6749 section 4) and reads the token response. */
export async function requestToken(request: TokenRequest): Promise<TokenResult> {
  const url = parseTokenUrl(request.tokenUrl);
  const body = Buffer.from(
    new URLSearchParams({ ...request.form, client_id: request.clientId }).toString(),
    "utf8",
  );
  const headers: [string, string][] = [
    ["Content-Type", "application/x-www-form-urlencoded"],
    ["Accept", "application/json"],
    ["Content-Length", String(body.length)],
  ];
  if (request.clientSecret !== "")
    headers.push(["Authorization", basicClientCredentials(request.clientId, request.clientSecret)]);
  const response = await sendFollowingRedirects(
    { method: "POST", url, headers, body },
    { signal: AbortSignal.timeout(30_000), network: request.network },
  );
  return readTokenResponse(response.status, response.body);
}

function readTokenResponse(status: number, body: Buffer): TokenResult {
  const json = parseJsonObject(body);
  const accessToken = textOf(json, "access_token");
  if (status < 200 || status >= 300 || accessToken === undefined) throw refusal(status, json);
  return {
    token: {
      accessToken,
      tokenType: textOf(json, "token_type") ?? "Bearer",
      refreshToken: textOf(json, "refresh_token") ?? null,
      expiresAt: expiryFrom(json["expires_in"]),
      scope: textOf(json, "scope") ?? null,
    },
    idToken: textOf(json, "id_token"),
  };
}

function refusal(status: number, json: Record<string, unknown>): RequestFailed {
  const reason = [textOf(json, "error"), textOf(json, "error_description")].filter(Boolean).join(": ");
  const detail = reason === "" ? "." : `: ${reason}`;
  return new RequestFailed(`The token endpoint refused the request (${String(status)})${detail}`);
}

function textOf(json: Record<string, unknown>, name: string): string | undefined {
  const value = json[name];
  return typeof value === "string" && value !== "" ? value : undefined;
}

function expiryFrom(expiresIn: unknown): string | null {
  const seconds = Number(expiresIn);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;
}

function parseJsonObject(body: Buffer): Record<string, unknown> {
  if (body.length > MAX_TOKEN_RESPONSE_BYTES) throw new RequestFailed("The token response is too large.");
  try {
    const parsed: unknown = JSON.parse(body.toString("utf8"));
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseTokenUrl(text: string): URL {
  try {
    const url = new URL(text);
    if (isLoopbackOrHttps(url)) return url;
  } catch {
    // reported below
  }
  throw new RequestFailed("The token URL must be an https:// address (or http:// on this computer).");
}

/** RFC 6749 section 2.3.1: id and secret are form-encoded before Basic encoding. */
function basicClientCredentials(clientId: string, clientSecret: string): string {
  const encode = (text: string): string => encodeURIComponent(text).replace(/%20/g, "+");
  return `Basic ${Buffer.from(`${encode(clientId)}:${encode(clientSecret)}`).toString("base64")}`;
}
