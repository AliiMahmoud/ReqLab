import type { RequestAuth } from "@shared/models/auth";
import { RequestDefinition, type KeyValue, type RequestBody } from "@shared/models/request";
import { ImportFailed } from "../../errors";
import type { CurlCommand } from "./curl-options";
import { readCurlCommand } from "./read-curl-command";

export interface ParsedCurl {
  definition: RequestDefinition;
  warnings: string[];
}

/** A pasted `curl …` command as a request: method, URL, headers, auth and body. */
export function parseCurl(text: string): ParsedCurl {
  const command = readCurlCommand(text);
  const { auth, headers } = extractAuth(command);
  const { body, headers: finalHeaders } = buildBody(command, headers);
  const parsed = RequestDefinition.safeParse({
    method: chooseMethod(command),
    url: buildUrl(command),
    params: [],
    headers: finalHeaders.map(([key, value]): KeyValue => ({ key, value, isEnabled: true })),
    body,
    auth,
  });
  if (!parsed.success) throw new ImportFailed("The cURL command is too large or has invalid parts.");
  return { definition: parsed.data, warnings: command.warnings };
}

function chooseMethod(command: CurlCommand): string {
  if (command.method !== undefined) return command.method;
  if (command.isHead) return "HEAD";
  const hasBody = command.form.length > 0 || (command.data.length > 0 && !command.isGet);
  return hasBody ? "POST" : "GET";
}

/** curl assumes http:// without a scheme; with -G the data becomes the query string. */
function buildUrl(command: CurlCommand): string {
  const url =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(command.url) || command.url.startsWith("{{")
      ? command.url
      : `http://${command.url}`;
  if (!command.isGet || command.data.length === 0) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${command.data.join("&")}`;
}

/** -u, --oauth2-bearer, or an Authorization header become the request's auth (Basic, Digest, Bearer). */
function extractAuth(command: CurlCommand): { auth: RequestAuth; headers: [string, string][] } {
  if (command.user !== undefined) {
    const [username = "", ...rest] = command.user.split(":");
    return {
      auth: { type: command.authScheme, username, password: rest.join(":") },
      headers: command.headers,
    };
  }
  if (command.bearerToken !== undefined)
    return { auth: { type: "bearer", token: command.bearerToken }, headers: command.headers };
  const index = command.headers.findIndex(([name]) => name.toLowerCase() === "authorization");
  const auth = index < 0 ? undefined : authFromHeader(command.headers[index]?.[1] ?? "");
  if (auth === undefined) return { auth: { type: "none" }, headers: command.headers };
  return { auth, headers: command.headers.filter((_header, position) => position !== index) };
}

function authFromHeader(value: string): RequestAuth | undefined {
  const [scheme = "", ...rest] = value.trim().split(/\s+/);
  const credentials = rest.join(" ");
  if (/^bearer$/i.test(scheme) && credentials !== "") return { type: "bearer", token: credentials };
  if (!/^basic$/i.test(scheme)) return undefined;
  const decoded = Buffer.from(credentials, "base64").toString("utf8");
  if (!decoded.includes(":") || decoded.includes("�")) return undefined;
  const [username = "", ...password] = decoded.split(":");
  return { type: "basic", username, password: password.join(":") };
}

function buildBody(
  command: CurlCommand,
  headers: [string, string][],
): { body: RequestBody; headers: [string, string][] } {
  const contentTypeIndex = headers.findIndex(([name]) => name.toLowerCase() === "content-type");
  const contentType = headers[contentTypeIndex]?.[1].toLowerCase() ?? "";
  if (command.form.length > 0) {
    // The multipart boundary is ReqLab's own, so a pasted multipart Content-Type would be wrong.
    const withoutType = headers.filter((_header, index) => index !== contentTypeIndex);
    const fields = command.form.map(([key, value]): KeyValue => ({ key, value, isEnabled: true }));
    return { body: { type: "form-data", fields }, headers: withoutType };
  }
  if (command.data.length === 0 || command.isGet) return { body: { type: "none" }, headers };
  return { body: bodyFromData(command.data.join("&"), contentType), headers };
}

function bodyFromData(text: string, contentType: string): RequestBody {
  if (contentType.includes("json") || (contentType === "" && isJson(text))) return jsonBody(text);
  const isFormType = contentType === "" || contentType.includes("x-www-form-urlencoded");
  if (isFormType && looksLikeFormFields(text)) {
    const fields = [...new URLSearchParams(text)].map(([key, value]): KeyValue => ({
      key,
      value,
      isEnabled: true,
    }));
    return { type: "urlencoded", fields };
  }
  return {
    type: "raw",
    text,
    contentType: (contentType || "application/x-www-form-urlencoded").slice(0, 200),
  };
}

/** Valid JSON is pretty-printed for editing; anything else is kept as typed. */
function jsonBody(text: string): RequestBody {
  return { type: "json", text: isJson(text) ? JSON.stringify(JSON.parse(text), null, 2) : text };
}

function isJson(text: string): boolean {
  if (!/^\s*[[{]/.test(text)) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/** "a=1&b=2" (no line breaks, every part a name=value pair). */
function looksLikeFormFields(text: string): boolean {
  return !/[\r\n]/.test(text) && text.split("&").every((part) => /^[^=]+=/.test(part));
}
