import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { connect as tlsConnect } from "node:tls";
import type { NetworkPlan, ProxyRoute } from "../network/network-plan";
import { openProxyTunnel } from "./open-proxy-tunnel";
import { ExchangeTimer } from "./exchange-timer";
import { keepSocketErrorsHandled } from "./keep-socket-errors-handled";
import { NetworkLog } from "./network-log";
import type { HeaderList, PreparedRequest, RawResponse } from "./http-types";
import { readResponseBody } from "./response-body-reader";

export interface ExchangeOptions {
  signal: AbortSignal;
  /** TLS and proxy settings of the workspace; undefined means direct, with the system's defaults. */
  network: NetworkPlan | undefined;
  /** Settings › Request › Max response size; the default limit when absent. */
  maxResponseBytes?: number;
  /** Step-by-step notes for the Log button; none are kept when absent. */
  log?: NetworkLog;
}

/** Where Node should connect and with which extra options (TLS, proxy, tunnel). */
interface Route {
  target: URL | string;
  options: https.RequestOptions;
  transport: typeof http | typeof https;
}

/**
 * Sends exactly one request and reads its response; redirects are handled by the caller.
 * A fresh connection every time (no shared agent), so timings are real and nothing is shared.
 */
export async function sendOneExchange(
  request: PreparedRequest,
  options: ExchangeOptions,
): Promise<RawResponse> {
  const log = options.log ?? new NetworkLog();
  log.startExchange(request);
  return exchange(request, await planRoute(request, { ...options, log }), { ...options, log });
}

/** Direct; through the proxy (plain http, absolute URL); or through a CONNECT tunnel (https, end-to-end TLS). */
async function planRoute(
  request: PreparedRequest,
  { signal, network, log }: ExchangeOptions & { log: NetworkLog },
): Promise<Route> {
  const isHttps = request.url.protocol === "https:";
  const tlsOptions = isHttps && network !== undefined ? network.tlsOptionsFor(request.url) : {};
  const proxy = await network?.proxyFor(request.url);
  if (proxy === undefined) {
    log.noteNetwork("proxy", "none (direct)");
    log.add("Proxy: none, connecting directly");
    return { target: request.url, options: tlsOptions, transport: isHttps ? https : http };
  }
  if (isHttps) {
    const tunnel = await openProxyTunnel(proxy, request.url, { signal, log });
    const createConnection = () => {
      const secure = tlsConnect({ ...tlsOptions, socket: tunnel, servername: request.url.hostname });
      // Close the tunnel with the TLS session, so no idle connection is left for the proxy to reset.
      secure.once("close", () => tunnel.destroy());
      return secure;
    };
    return { target: request.url, options: { ...tlsOptions, createConnection }, transport: https };
  }
  log.noteNetwork("proxy", `${proxy.url.host} (plain http)`);
  log.add(`Proxy: sending plain http through ${proxy.url.host}`);
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
  { signal, maxResponseBytes, log }: ExchangeOptions & { log: NetworkLog },
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const timer = new ExchangeTimer();
    const options = requestOptions(request, route, signal);
    log.noteSentHeaders(toHeaderList(options.headers));
    const outgoing =
      typeof route.target === "string"
        ? route.transport.request(options)
        : route.transport.request(route.target, options);
    // No timer of its own: only Settings › Request timeout (in `signal`) or Cancel stops it.
    outgoing.on("socket", (socket) => {
      keepSocketErrorsHandled(socket);
      timer.watchSocket(socket);
      log.watchSocket(socket, "server");
    });
    outgoing.on("finish", () => {
      log.add("Request sent; waiting for the response");
    });
    outgoing.on("response", (response) => {
      receive(response, { timer, log, maxResponseBytes }).then(resolve, reject);
    });
    outgoing.on("error", reject);
    outgoing.end(request.body);
  });
}

/** Node's options for one request: its headers as sent, the route's TLS / proxy options, the agent. */
function requestOptions(request: PreparedRequest, route: Route, signal: AbortSignal) {
  const extraHeaders = route.options.headers as Record<string, string> | undefined;
  const headers = { host: request.url.host, ...toNodeHeaders(request.headers), ...extraHeaders };
  // A fresh agent for every request, except through a proxy tunnel: Node ignores
  // `createConnection` whenever an agent is set, and would connect to the server directly.
  const connection = route.options.createConnection === undefined ? { agent: false as const } : {};
  return { ...route.options, method: request.method, headers, signal, ...connection };
}

async function receive(
  response: IncomingMessage,
  {
    timer,
    log,
    maxResponseBytes,
  }: { timer: ExchangeTimer; log: NetworkLog; maxResponseBytes?: number | undefined },
): Promise<RawResponse> {
  timer.markFirstByte();
  log.add(
    `Response: HTTP/${response.httpVersion} ${String(response.statusCode)} ${response.statusMessage ?? ""}`,
  );
  const body = await readResponseBody(response, maxResponseBytes);
  log.add(`Body received: ${String(body.length)} bytes`);
  const raw = toRawResponse(response, body, timer);
  log.recordResponse(raw);
  return raw;
}

/** Node's header object back as name/value pairs, for the log. */
function toHeaderList(headers: Record<string, string | string[]>): HeaderList {
  return Object.entries(headers).flatMap(([name, value]) =>
    [value].flat().map((single): [string, string] => [name, single]),
  );
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
