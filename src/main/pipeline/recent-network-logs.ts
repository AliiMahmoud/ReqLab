import type { NetworkLogView } from "@shared/models/network-log";

/** How many sends' logs are kept (the oldest goes first). Memory only, never saved. */
const KEPT_LOGS = 20;

/** The network logs of the last few sends, by request id, already masked; for the Log button. */
export class RecentNetworkLogs {
  readonly #logs = new Map<string, NetworkLogView>();

  remember(requestId: string, log: NetworkLogView): void {
    this.#logs.delete(requestId);
    this.#logs.set(requestId, log);
    const oldest = this.#logs.keys().next().value;
    if (this.#logs.size > KEPT_LOGS && oldest !== undefined) this.#logs.delete(oldest);
  }

  get(requestId: string): NetworkLogView | null {
    return this.#logs.get(requestId) ?? null;
  }
}
