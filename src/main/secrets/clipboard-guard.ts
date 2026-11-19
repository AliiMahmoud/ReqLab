import { clipboard } from "electron";

const CLEAR_AFTER_MS = 30_000;

/**
 * Copies a secret to the system clipboard from main (the UI never holds it) and clears it after
 * 30 seconds, unless the user has copied something else meanwhile.
 */
export class ClipboardGuard {
  #clearTimer: NodeJS.Timeout | undefined;

  /** Copies text that holds no secret: nothing to clear later. */
  async copyText(value: string): Promise<void> {
    await clipboard.writeText(value);
  }

  async copySecret(value: string): Promise<void> {
    await clipboard.writeText(value);
    clearTimeout(this.#clearTimer);
    this.#clearTimer = setTimeout(() => {
      void clearIfUnchanged(value);
    }, CLEAR_AFTER_MS);
  }
}

async function clearIfUnchanged(value: string): Promise<void> {
  if ((await clipboard.readText()) === value) clipboard.clear();
}
