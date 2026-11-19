const MASK = "••••••";
/** Very short values would mask ordinary text (e.g. "1"), so they are left alone. */
const MIN_MASKED_LENGTH = 4;

/** Hides secret values inside text that goes back to the UI (final URLs, error messages). */
export class SecretMasker {
  readonly #secrets: string[];

  constructor(secretValues: Iterable<string>) {
    this.#secrets = [...secretValues]
      .filter((value) => value.length >= MIN_MASKED_LENGTH)
      .sort((a, b) => b.length - a.length);
  }

  /** A masker that also hides this value (e.g. an OAuth token fetched during the send). */
  including(value: string): SecretMasker {
    return new SecretMasker([...this.#secrets, value]);
  }

  containsSecret(text: string): boolean {
    return this.#secrets.some((secret) => text.includes(secret));
  }

  mask(text: string): string {
    return this.#secrets.reduce((result, secret) => result.split(secret).join(MASK), text);
  }
}
