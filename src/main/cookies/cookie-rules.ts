/** Domain and path matching from RFC 6265 (sections 5.1.3 and 5.1.4). */

/** A cookie for "example.com" also goes to "api.example.com", unless it is host-only. */
export function domainMatches(host: string, cookieDomain: string, isHostOnly: boolean): boolean {
  const requestHost = host.toLowerCase();
  if (requestHost === cookieDomain) return true;
  return !isHostOnly && !isIpAddress(requestHost) && requestHost.endsWith(`.${cookieDomain}`);
}

/** "/api" matches "/api", "/api/" and "/api/users", but not "/apix". */
export function pathMatches(requestPath: string, cookiePath: string): boolean {
  if (requestPath === cookiePath) return true;
  if (!requestPath.startsWith(cookiePath)) return false;
  return cookiePath.endsWith("/") || requestPath.charAt(cookiePath.length) === "/";
}

/** The directory of the request path: "/a/b/c" → "/a/b"; anything without a second "/" → "/". */
export function defaultPath(requestPath: string): string {
  if (!requestPath.startsWith("/")) return "/";
  const lastSlash = requestPath.lastIndexOf("/");
  return lastSlash <= 0 ? "/" : requestPath.slice(0, lastSlash);
}

export function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[");
}
