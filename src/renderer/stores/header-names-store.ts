import { api } from "../api";
import { signal } from "./signal";

/** Common HTTP request headers, suggested while typing a header's name. */
const KNOWN_HEADERS = [
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Connection",
  "Content-Disposition",
  "Content-Encoding",
  "Content-Language",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "DNT",
  "Expect",
  "Forwarded",
  "From",
  "Host",
  "Idempotency-Key",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "If-Range",
  "If-Unmodified-Since",
  "Origin",
  "Pragma",
  "Prefer",
  "Proxy-Authorization",
  "Range",
  "Referer",
  "TE",
  "Upgrade",
  "User-Agent",
  "Via",
  "X-API-Key",
  "X-Correlation-ID",
  "X-Forwarded-For",
  "X-Forwarded-Host",
  "X-Forwarded-Proto",
  "X-Request-ID",
  "X-Requested-With",
] as const;

/**
 * Header names to suggest: the known HTTP headers and every name the workspace's saved requests
 * use, once each (case-insensitive; a saved spelling wins), A–Z.
 */
export const headerNames = signal<readonly string[]>([...KNOWN_HEADERS]);

/** Called when a workspace opens and after a request is saved. */
export async function loadHeaderNames(workspaceId: string): Promise<void> {
  const result = await api.listHeaderNames({ workspaceId });
  if (result.ok) headerNames.set(mergeNames(result.value));
}

function mergeNames(saved: readonly string[]): string[] {
  const byLowerCase = new Map<string, string>(KNOWN_HEADERS.map((name) => [name.toLowerCase(), name]));
  for (const name of saved) byLowerCase.set(name.toLowerCase(), name);
  return [...byLowerCase.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
