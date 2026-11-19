import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { Signal } from "../stores/signal";

/** Re-renders a Lit component whenever one of the signals it watches changes. */
class SignalWatcher implements ReactiveController {
  #unsubscribers: (() => void)[] = [];

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly signals: readonly Signal<unknown>[],
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    this.#unsubscribers = this.signals.map((signal) =>
      signal.subscribe(() => {
        this.host.requestUpdate();
      }),
    );
  }

  hostDisconnected(): void {
    for (const unsubscribe of this.#unsubscribers) unsubscribe();
    this.#unsubscribers = [];
  }
}

export function watch(host: ReactiveControllerHost, ...signals: Signal<unknown>[]): void {
  new SignalWatcher(host, signals);
}
