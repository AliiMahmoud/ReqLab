import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { connect as tlsConnect } from "node:tls";
import type { NetworkPlan, ProxyRoute } from "../network/network-plan";
import { openProxyTunnel } from "./open-proxy-tunnel";
import { ExchangeTimer } from "./exchange-timer";
import type { HeaderList, PreparedRequest, RawResponse } from "./http-types";
import { readResponseBody } from "./response-body-reader";

export interface ExchangeOptions {
  signal: AbortSignal;
  /** TLS and proxy settings of the workspace; undefined means direct, with the system's defaults. */
  network: NetworkPlan | undefined;
  /** Settings › Request › Max response size; the default limit when absent. */
  maxResponseBytes?: number;
}

/** Where Node should connect and with which extra options (TLS, proxy, tunnel). */
interface Route {
  target: URL | string;
  options: https.RequestOptions;
  transport: typeof http | typeof https;
}

/**
 * Sends exactly one request and reads its response; redirects are handled by the caller.
 * A fresh connection every time (agent: false), so timings are real and nothing is shared.
 */
export async function sendOneExchange(
  request: PreparedRequest,
  options: ExchangeOptions,
): Promise<RawResponse> {
  return exchange(request, await planRoute(request, options), options);
}

/** Direct; through the proxy (plain http, absolute URL); or through a CONNECT tunnel (https, end-to-end TLS). */
async function planRoute(request: PreparedRequest, { signal, network }: ExchangeOptions): Promise<Route> {
  const isHttps = request.url.protocol === "https:";
  const tlsOptions = isHttps && network !== undefined ? network.tlsOptionsFor(request.url) : {};
  const proxy = await network?.proxyFor(request.url);
  if (proxy === undefined)
    return { target: request.url, options: tlsOptions, transport: isHttps ? https : http };
  if (isHttps) {
    const socket = await openProxyTunnel(proxy, request.url, signal);
    const createConnection = () => tlsConnect({ ...tlsOptions, socket, servername: request.url.hostname });
    return { target: request.url, options: { ...tlsOptions, createConnection }, transport: https };
  }
  return plainProxyRoute(request, proxy);
}

/** Plain http through a proxy: the request line carries the absolute URL. */
function plainProxyRoute(request: PreparedRequest, proxy: ProxyRoute): Route {
  const headers = proxy.authorization === undefined ? {} : { "proxy-authorization": proxy.authorization };
  const options = { host: proxy.url.hostname, port: proxy.url.port || 80, path: request.url.href, headers };
  return { target: request.url.href, options, transport: http };
}

function exchange(
  request: PreparedRequest,
  route: Route,
  { signal, maxResponseBytes }: ExchangeOptions,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const timer = new ExchangeTimer();
    const extraHeaders = route.options.headers as Record<string, string> | undefined;
    const headers = { host: request.url.host, ...toNodeHeaders(request.headers), ...extraHeaders };
    const options = { ...route.options, method: request.method, headers, agent: false, signal };
    const outgoing =
      typeof route.target === "string"
        ? route.transport.request(options)
        : route.transport.request(route.target, options);
    // No timer of its own: only Settings › Request timeout (in `signal`) or Cancel stops it.
    outgoing.on("socket", (socket) => {
      timer.watchSocket(socket);
    });
    outgoing.on("response", (response) => {
      timer.markFirstByte();
      readResponseBody(response, maxResponseBytes)
        .then((body) => {
          resolve(toRawResponse(response, body, timer));
        })
        .catch(reject);
    });
    outgoing.on("error", reject);
    outgoing.end(request.body);
  });
}

/** Repeated header names become one array, which Node sends as separate header lines. */
function toNodeHeaders(headers: HeaderList): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const [name, value] of headers) {
    const key = name.toLowerCase();
    grouped[key] = [...(grouped[key] ?? []), value];
  }
  return grouped;
}

function toRawResponse(response: IncomingMessage, body: Buffer, timer: ExchangeTimer): RawResponse {
  return {
    status: response.statusCode ?? 0,
    statusText: response.statusMessage ?? "",
    httpVersion: response.httpVersion,
    headers: pairUp(response.rawHeaders),
    body,
    timings: timer.finish(),
  };
}

/** Node gives raw headers as [name, value, name, value, …], keeping original case and repeats. */
function pairUp(rawHeaders: string[]): HeaderList {
  const pairs: HeaderList = [];
  for (let index = 0; index + 1 < rawHeaders.length; index += 2) {
    pairs.push([rawHeaders[index] ?? "", rawHeaders[index + 1] ?? ""]);
  }
  return pairs;
}
