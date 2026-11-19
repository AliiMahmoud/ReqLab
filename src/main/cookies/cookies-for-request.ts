import type { StoredCookie } from "@shared/models/cookie";
import { domainMatches, pathMatches } from "./cookie-rules";

/** The Cookie header value for a URL: matching cookies, longest path first (RFC 6265 section 5.4). */
export function cookieHeaderFor(url: URL, cookies: readonly StoredCookie[]): string | undefined {
  const matching = cookies
    .filter((cookie) => domainMatches(url.hostname, cookie.domain, cookie.isHostOnly))
    .filter((cookie) => pathMatches(url.pathname || "/", cookie.path))
    .filter((cookie) => !cookie.isSecure || url.protocol === "https:")
    .sort((a, b) => b.path.length - a.path.length);
  return matching.length === 0
    ? undefined
    : matching.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}
