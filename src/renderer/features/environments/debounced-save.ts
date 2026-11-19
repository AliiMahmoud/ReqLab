const SAVE_DELAY_MS = 600;

/** Runs a save shortly after the last edit; `flush` runs a pending one at once (before switching away). */
export class DebouncedSave {
  #timer: ReturnType<typeof setTimeout> | undefined;
  #pending: (() => Promise<void>) | undefined;

  schedule(save: () => Promise<void>): void {
    clearTimeout(this.#timer);
    this.#pending = save;
    this.#timer = setTimeout(() => void this.flush(), SAVE_DELAY_MS);
  }

  async flush(): Promise<void> {
    clearTimeout(this.#timer);
    const save = this.#pending;
    this.#pending = undefined;
    if (save !== undefined) await save();
  }
}
