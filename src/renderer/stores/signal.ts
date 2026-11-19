type Listener = () => void;

/** A value that tells its listeners when it changes. Components re-render through SignalWatcher. */
export class Signal<T> {
  #value: T;
  readonly #listeners = new Set<Listener>();

  constructor(initialValue: T) {
    this.#value = initialValue;
  }

  get(): T {
    return this.#value;
  }

  set(value: T): void {
    if (Object.is(value, this.#value)) return;
    this.#value = value;
    for (const listener of this.#listeners) listener();
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }
}

export function signal<T>(initialValue: T): Signal<T> {
  return new Signal(initialValue);
}
