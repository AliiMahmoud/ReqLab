/** How many responses' bodies are kept, and how many bytes in all (the oldest go first). */
const MAX_KEPT = 20;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

export interface KeptBody {
  bytes: Buffer;
  contentType: string;
  /** It holds a secret variable's value: copied through the clearing clipboard. */
  containsSecret: boolean;
}

/**
 * The bodies of the last few responses, exactly as received, for the response's Copy and Download
 * (the UI only has a display copy: cut, masked, or an image). Memory only, never saved.
 */
export class RecentResponseBodies {
  readonly #bodies = new Map<string, KeptBody>();

  remember(requestId: string, body: KeptBody): void {
    this.#bodies.delete(requestId);
    this.#bodies.set(requestId, body);
    while (this.#bodies.size > MAX_KEPT || (this.#bodies.size > 1 && this.totalBytes() > MAX_TOTAL_BYTES)) {
      const oldest = this.#bodies.keys().next().value;
      if (oldest === undefined) break;
      this.#bodies.delete(oldest);
    }
  }

  get(requestId: string): KeptBody | undefined {
    return this.#bodies.get(requestId);
  }

  private totalBytes(): number {
    let total = 0;
    for (const body of this.#bodies.values()) total += body.bytes.length;
    return total;
  }
}
