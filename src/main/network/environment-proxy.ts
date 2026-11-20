/**
 * The proxy from environment variables, as curl and most command-line tools read them:
 * HTTPS_PROXY for https, HTTP_PROXY for http, and NO_PROXY for hosts that go direct.
 * Chromium ignores these on Windows and macOS, so "System proxy" checks them itself.
 */
export function findEnvironmentProxy(target: URL): { url: URL; variable: string } | undefined {
  const names = target.protocol === "https:" ? ["HTTPS_PROXY", "https_proxy"] : ["HTTP_PROXY", "http_proxy"];
  const variable = names.find((name) => (process.env[name] ?? "").trim() !== "");
  if (variable === undefined || isExcludedByNoProxy(target.hostname)) return undefined;
  const url = parseProxyAddress(process.env[variable] ?? "");
  return url === undefined ? undefined : { url, variable };
}

/** "proxy:8080" or "http://user:pass@proxy:8080"; only plain HTTP proxies are supported. */
function parseProxyAddress(text: string): URL | undefined {
  const value = text.trim();
  try {
    const url = new URL(value.includes("://") ? value : `http://${value}`);
    return url.protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}

/** NO_PROXY: "*" for everything, or names such as "corp.com" / ".corp.com" (with their subdomains). */
function isExcludedByNoProxy(host: string): boolean {
  const list = process.env["NO_PROXY"] ?? process.env["no_proxy"] ?? "";
  const name = host.toLowerCase();
  return list
    .split(/[\s,]+/)
    .map((entry) =>
      entry
        .toLowerCase()
        .replace(/^\*?\./, "")
        .replace(/:\d+$/, ""),
    )
    .some((entry) => entry === "*" || name === entry || name.endsWith(`.${entry}`));
}
