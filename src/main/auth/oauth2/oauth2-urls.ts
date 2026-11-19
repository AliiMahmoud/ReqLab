const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** OAuth endpoints must use TLS, except a server on this computer (useful for development). */
export function isLoopbackOrHttps(url: URL): boolean {
  return url.protocol === "https:" || (url.protocol === "http:" && LOOPBACK.has(url.hostname));
}
