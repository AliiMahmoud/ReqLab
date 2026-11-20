import { session } from "electron";
import { findEnvironmentProxy } from "./environment-proxy";

export type SystemProxy =
  { kind: "proxy"; url: URL; source: string } | { kind: "direct" } | { kind: "unsupported"; rule: string };

/**
 * The computer's proxy for a URL: first the system settings as Electron resolves them (including
 * PAC files and auto-detect), then the HTTPS_PROXY / HTTP_PROXY environment variables.
 * Only plain HTTP proxies ("PROXY host:port") can be used; SOCKS and HTTPS proxies are reported.
 */
export async function findSystemProxy(target: URL): Promise<SystemProxy> {
  const rules = (await session.defaultSession.resolveProxy(target.href))
    .split(";")
    .map((rule) => rule.trim())
    .filter((rule) => rule !== "");
  const firstRule = rules[0] ?? "DIRECT";
  if (isDirect(firstRule)) return fromEnvironment(target);
  // The list is in fallback order: use the first HTTP proxy before any DIRECT.
  for (const rule of rules) {
    if (isDirect(rule)) break;
    const url = parseProxyRule(rule);
    if (url !== undefined) return { kind: "proxy", url, source: "system settings" };
  }
  return { kind: "unsupported", rule: firstRule };
}

/** What "System proxy" finds right now, for Settings › Network (no credentials shown). */
export async function describeSystemProxy(): Promise<string> {
  const found = await findSystemProxy(new URL("https://example.com/"));
  if (found.kind === "proxy") return `${found.url.host} (from ${found.source})`;
  if (found.kind === "unsupported") return `${found.rule}: not supported, only HTTP proxies are`;
  return "none: requests connect directly";
}

function fromEnvironment(target: URL): SystemProxy {
  const found = findEnvironmentProxy(target);
  return found === undefined ? { kind: "direct" } : { kind: "proxy", url: found.url, source: found.variable };
}

function isDirect(rule: string): boolean {
  return rule.toUpperCase() === "DIRECT";
}

function parseProxyRule(rule: string): URL | undefined {
  const match = /^PROXY\s+(\S+)$/i.exec(rule);
  if (match === null) return undefined;
  try {
    return new URL(`http://${match[1] ?? ""}`);
  } catch {
    return undefined;
  }
}
