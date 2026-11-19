import { performance } from "node:perf_hooks";
import type { Socket } from "node:net";
import type { Timings } from "@shared/models/http-exchange";

/** Records when each phase of one exchange finished, from the socket's own events. */
export class ExchangeTimer {
  readonly #startedAt = performance.now();
  #lookedUpAt: number | undefined;
  #connectedAt: number | undefined;
  #securedAt: number | undefined;
  #firstByteAt: number | undefined;

  watchSocket(socket: Socket): void {
    socket.once("lookup", () => (this.#lookedUpAt = performance.now()));
    socket.once("connect", () => (this.#connectedAt = performance.now()));
    socket.once("secureConnect", () => (this.#securedAt = performance.now()));
  }

  markFirstByte(): void {
    this.#firstByteAt = performance.now();
  }

  finish(): Timings {
    const endedAt = performance.now();
    const firstByteAt = this.#firstByteAt ?? endedAt;
    const connectStart = this.#lookedUpAt ?? this.#startedAt;
    const waitStart = this.#securedAt ?? this.#connectedAt ?? this.#startedAt;
    return {
      dns: span(this.#startedAt, this.#lookedUpAt),
      connect: span(connectStart, this.#connectedAt),
      tls: this.#connectedAt === undefined ? null : span(this.#connectedAt, this.#securedAt),
      firstByte: firstByteAt - waitStart,
      download: endedAt - firstByteAt,
      total: endedAt - this.#startedAt,
    };
  }
}

function span(from: number, to: number | undefined): number | null {
  return to === undefined ? null : Math.max(0, to - from);
}
