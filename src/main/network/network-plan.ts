import { rootCertificates } from "node:tls";
import type { StoredNetworkSettings } from "./stored-network-settings";
import { findSystemProxy } from "./system-proxy";

export interface TlsOptions {
  rejectUnauthorized: boolean;
  ca?: string[];
  cert?: string;
  key?: string;
  passphrase?: string;
}

export interface ProxyRoute {
  url: URL;
  /** "Basic …" when the proxy needs credentials. */
  authorization: string | undefined;
}

/** How to reach one URL: which TLS options to use and whether to go through the proxy. */
export interface NetworkPlan {
  tlsOptionsFor(url: URL): TlsOptions;
  /** Per Settings › Network › Proxy: none, the system's proxy, or the custom one. */
  proxyFor(url: URL): Promise<ProxyRoute | undefined>;
}

export function createNetworkPlan(settings: StoredNetworkSettings): NetworkPlan {
  // Custom CAs are added to the system's trusted roots, never instead of them.
  const ca =
    settings.caCertificates.length === 0
      ? undefined
      : [...rootCertificates, ...settings.caCertificates.map((entry) => entry.pem)];
  return {
    tlsOptionsFor: (url) => {
      const client = settings.clientCertificates.find((entry) => hostMatches(url.hostname, entry.host));
      return {
        rejectUnauthorized: settings.verifyTls,
        ...(ca === undefined ? {} : { ca }),
        ...(client === undefined
          ? {}
          : { cert: client.certificatePem, key: client.keyPem, passphrase: client.passphrase }),
      };
    },
    proxyFor: (url) => proxyRoute(settings.proxy, url),
  };
}

async function proxyRoute(
  proxy: StoredNetworkSettings["proxy"],
  target: URL,
): Promise<ProxyRoute | undefined> {
  if (proxy.mode === "none") return undefined;
  if (proxy.mode === "system") {
    const system = await findSystemProxy(target);
    return system === undefined ? undefined : { url: system, authorization: undefined };
  }
  if (proxy.url === "") return undefined;
  const bypass = proxy.bypass.split(/[\s,]+/).filter(Boolean);
  if (bypass.some((pattern) => hostMatches(target.hostname, pattern.replace(/^\./, "*.")))) return undefined;
  const authorization =
    proxy.username === ""
      ? undefined
      : `Basic ${Buffer.from(`${proxy.username}:${proxy.password}`).toString("base64")}`;
  return { url: new URL(proxy.url), authorization };
}

/** "api.example.com" matches itself; "*.example.com" matches example.com and any subdomain. */
export function hostMatches(host: string, pattern: string): boolean {
  const name = host.toLowerCase().replace(/^\[|\]$/g, "");
  const rule = pattern.toLowerCase();
  if (!rule.startsWith("*.")) return name === rule;
  const base = rule.slice(2);
  return name === base || name.endsWith(`.${base}`);
}
