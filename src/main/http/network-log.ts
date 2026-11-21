import { performance } from "node:perf_hooks";
import type { Socket } from "node:net";
import type { LoggedExchange, NetworkLogView } from "@shared/models/network-log";
import type { HeaderList, PreparedRequest, RawResponse } from "./http-types";
import { bodyForLog, headersForLog, maskStrings, urlForLog } from "./network-log-format";
import { watchSocketForLog } from "./network-log-sockets";

const MAX_EVENTS = 300;
const MAX_EXCHANGES = 20;

/**
 * The log of one send, recorded at the network layer (after the proxy is chosen), for the Log
 * button, like Postman's console. Credentials are redacted here; secret variables are masked by
 * the sender before the log leaves main.
 */
export class NetworkLog {
  readonly #startedAt = performance.now();
  readonly #startedAtIso = new Date().toISOString();
  readonly #events: NetworkLogView["events"] = [];
  readonly #exchanges: LoggedExchange[] = [];
  #error: NetworkLogView["error"];

  add(text: string): void {
    if (this.#events.length >= MAX_EVENTS) return;
    this.#events.push({ ms: Math.round(performance.now() - this.#startedAt), text });
  }

  startExchange(request: PreparedRequest): void {
    if (this.#exchanges.length >= MAX_EXCHANGES) return;
    const body = bodyForLog(request.body);
    this.#exchanges.push({
      request: {
        method: request.method,
        url: urlForLog(request.url),
        headers: headersForLog(request.headers),
        ...(body === undefined ? {} : { body }),
        bodySize: request.body?.length ?? 0,
      },
      network: {},
    });
    this.add(`${request.method} ${urlForLog(request.url)}`);
  }

  /** The headers exactly as they go out, with those Node and the proxy add (Host, Proxy-Authorization). */
  noteSentHeaders(headers: HeaderList): void {
    const current = this.#exchanges.at(-1);
    if (current !== undefined) current.request.headers = headersForLog(headers);
  }

  /** Facts about the connection of the current exchange: proxy, addresses, TLS, certificate. */
  noteNetwork(key: string, value: string): void {
    const current = this.#exchanges.at(-1);
    if (current !== undefined) current.network[key] = value;
  }

  recordResponse(response: RawResponse): void {
    const current = this.#exchanges.at(-1);
    if (current === undefined) return;
    const body = bodyForLog(response.body);
    current.response = {
      status: response.status,
      statusText: response.statusText,
      httpVersion: response.httpVersion,
      headers: headersForLog(response.headers),
      ...(body === undefined ? {} : { body }),
      bodySize: response.body.length,
      timings: response.timings,
    };
  }

  /** The first failure wins: the network layer's own, with Node's code, comes before the sender's. */
  fail(message: string, cause?: string): void {
    if (this.#error !== undefined) return;
    this.#error = { message, ...(cause === undefined ? {} : { cause }) };
    this.add(`Failed: ${message}${cause === undefined ? "" : ` [${cause}]`}`);
  }

  /** Logs what happens on a connection ("proxy" or "server"): DNS, TCP, TLS, errors, close. */
  watchSocket(socket: Socket, name: "proxy" | "server"): void {
    watchSocketForLog(this, socket, name);
  }

  /** The whole log, with `mask` applied to every string. */
  toView(mask: (text: string) => string): NetworkLogView {
    const view: NetworkLogView = {
      startedAt: this.#startedAtIso,
      exchanges: this.#exchanges,
      ...(this.#error === undefined ? {} : { error: this.#error }),
      events: this.#events,
    };
    return maskStrings(view, mask) as NetworkLogView;
  }
}
