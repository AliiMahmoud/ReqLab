import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { RequestFailed } from "../../errors";
import { openAuthorizationPage } from "./open-authorization-page";
import { isLoopbackOrHttps } from "./oauth2-urls";

const CALLBACK_TIMEOUT_MS = 5 * 60_000;
const CALLBACK_PAGE =
  '<!doctype html><meta charset=utf-8><title>ReqLab</title><p style="font:16px system-ui;margin:3em">ReqLab received the authorization. You can close this tab.</p>';

export interface AuthorizationResult {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  nonce: string | undefined;
}

/**
 * Authorization Code with PKCE (RFC 7636, S256): the system browser opens the authorization page and a
 * one-shot listener on 127.0.0.1 (random port) receives the redirect. `state` must match.
 */
export async function authorizeInBrowser(config: {
  authUrl: string;
  clientId: string;
  scope: string;
}): Promise<AuthorizationResult> {
  const codeVerifier = randomBytes(32).toString("base64url");
  const state = randomBytes(16).toString("base64url");
  const nonce = /\bopenid\b/.test(config.scope) ? randomBytes(16).toString("base64url") : undefined;
  const listener = await listenOnLoopback();
  try {
    const redirectUri = `http://127.0.0.1:${String(listener.port)}/callback`;
    const page = authorizationUrl(config, { redirectUri, state, nonce, codeChallenge: sha256(codeVerifier) });
    if (!(await openAuthorizationPage(page))) throw new RequestFailed("The authorization was cancelled.");
    const callback = await listener.nextCallback;
    return { code: checkCallback(callback, state), redirectUri, codeVerifier, nonce };
  } finally {
    listener.close();
  }
}

function authorizationUrl(
  config: { authUrl: string; clientId: string; scope: string },
  values: { redirectUri: string; state: string; nonce: string | undefined; codeChallenge: string },
): URL {
  let url: URL;
  try {
    url = new URL(config.authUrl);
  } catch {
    throw new RequestFailed("The authorization URL is not valid.");
  }
  if (!isLoopbackOrHttps(url)) throw new RequestFailed("The authorization URL must be an https:// address.");
  const params = {
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: values.redirectUri,
    scope: config.scope,
    state: values.state,
    code_challenge: values.codeChallenge,
    code_challenge_method: "S256",
  };
  for (const [name, value] of Object.entries(params)) if (value !== "") url.searchParams.set(name, value);
  if (values.nonce !== undefined) url.searchParams.set("nonce", values.nonce);
  return url;
}

/** The provider's answer: an error, or a code whose state must equal ours (constant-time compare). */
function checkCallback(callback: URLSearchParams, state: string): string {
  const error = callback.get("error");
  if (error !== null)
    throw new RequestFailed(
      `The authorization was refused: ${error} ${callback.get("error_description") ?? ""}`.trim(),
    );
  const returned = Buffer.from(callback.get("state") ?? "");
  const expected = Buffer.from(state);
  if (returned.length !== expected.length || !timingSafeEqual(returned, expected)) {
    throw new RequestFailed("The authorization response had the wrong state; it was ignored for safety.");
  }
  const code = callback.get("code");
  if (code === null || code === "") throw new RequestFailed("The authorization response had no code.");
  return code;
}

interface Listener {
  port: number;
  nextCallback: Promise<URLSearchParams>;
  close(): void;
}

function listenOnLoopback(): Promise<Listener> {
  return new Promise((resolve, reject) => {
    let deliver: (params: URLSearchParams) => void = () => undefined;
    const nextCallback = new Promise<URLSearchParams>((done, fail) => {
      deliver = done;
      setTimeout(() => {
        fail(new RequestFailed("No answer from the browser within 5 minutes."));
      }, CALLBACK_TIMEOUT_MS).unref();
    });
    const server = http.createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") return void response.writeHead(404).end();
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      });
      response.end(CALLBACK_PAGE);
      deliver(url.searchParams);
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({ port: (server.address() as AddressInfo).port, nextCallback, close: () => server.close() });
    });
  });
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("base64url");
}
