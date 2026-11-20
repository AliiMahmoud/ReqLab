import type { HeaderList } from "./http-types";
import { REDACTED, SENSITIVE_NAME } from "./sensitive-names";

/** Bodies longer than this are cut in the log; the full size is still given. */
const MAX_BODY_CHARS = 10_000;

/** Headers as an object, like Postman's console; repeated names become a list. Credentials redacted. */
export function headersForLog(headers: HeaderList): Record<string, string | string[]> {
  const shown: Record<string, string | string[]> = {};
  for (const [name, rawValue] of headers) {
    const value = SENSITIVE_NAME.test(name) ? REDACTED : rawValue;
    const existing = shown[name];
    shown[name] = existing === undefined ? value : [existing, value].flat();
  }
  return shown;
}

/** The URL without user-info, with credential-looking query values redacted. */
export function urlForLog(url: URL): string {
  const shown = new URL(url.href);
  shown.username = "";
  shown.password = "";
  for (const name of [...shown.searchParams.keys()]) {
    if (SENSITIVE_NAME.test(name)) shown.searchParams.set(name, REDACTED);
  }
  return shown.href.replaceAll(encodeURIComponent(REDACTED), REDACTED);
}

/** Text bodies as text (cut at 10,000 characters); binary bodies by size only. */
export function bodyForLog(body: Buffer | undefined): string | undefined {
  if (body === undefined || body.length === 0) return undefined;
  const text = body.toString("utf8");
  if (text.includes("\u0000") || text.includes("�")) return `<binary, ${String(body.length)} bytes>`;
  if (text.length <= MAX_BODY_CHARS) return text;
  return `${text.slice(0, MAX_BODY_CHARS)}… <cut, ${String(body.length)} bytes in all>`;
}

/** Applies `mask` (secret variable values → ••••) to every string in a log entry. */
export function maskStrings(value: unknown, mask: (text: string) => string): unknown {
  if (typeof value === "string") return mask(value);
  if (Array.isArray(value)) return value.map((item) => maskStrings(item, mask));
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskStrings(item, mask)]));
}
