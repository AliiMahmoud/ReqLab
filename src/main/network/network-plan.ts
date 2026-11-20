import { rootCertificates } from "node:tls";
import { RequestFailed } from "../errors";
import { isBypassed } from "./bypass-list";
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
  if (proxy.mode === "system") return systemRoute(target);
  if (proxy.url === "") return undefined;
  if (isBypassed(target.hostname, proxy.bypass)) return undefined;
  return {
    url: new URL(proxy.url.includes("://") ? proxy.url : `http://${proxy.url}`),
    authorization: basicAuthorization(proxy.username, proxy.password),
  };
}

/** A system proxy ReqLab cannot use is an error, never a silent direct connection. */
async function systemRoute(target: URL): Promise<ProxyRoute | undefined> {
  const found = await findSystemProxy(target);
  if (found.kind === "direct") return undefined;
  if (found.kind === "unsupported") {
    throw new RequestFailed(
      `The system proxy is "${found.rule}", which ReqLab does not support (only HTTP proxies). ` +
        "Choose Custom proxy or No proxy in Settings › Network.",
    );
  }
  // An HTTP_PROXY-style address may carry its credentials: http://user:pass@proxy:8080.
  const { username, password } = found.url;
  return {
    url: found.url,
    authorization: basicAuthorization(decodeURIComponent(username), decodeURIComponent(password)),
  };
}

function basicAuthorization(username: string, password: string): string | undefined {
  if (username === "") return undefined;
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

/** "api.example.com" matches itself; "*.example.com" matches example.com and any subdomain. */
export function hostMatches(host: string, pattern: string): boolean {
  const name = host.toLowerCase().replace(/^\[|\]$/g, "");
  const rule = pattern.toLowerCase();
  if (!rule.startsWith("*.")) return name === rule;
  const base = rule.slice(2);
  return name === base || name.endsWith(`.${base}`);
}
