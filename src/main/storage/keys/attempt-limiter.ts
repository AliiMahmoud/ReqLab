import { TooManyAttempts } from "../../errors";

const FREE_ATTEMPTS = 5;
const MAX_DELAY_SECONDS = 300;

interface Failures {
  count: number;
  lockedUntil: number;
}

/** Slows down password guessing: after 5 wrong tries, each next try waits 1s, 2s, 4s… up to 5 minutes. */
export class AttemptLimiter {
  readonly #failures = new Map<string, Failures>();

  assertCanAttempt(subject: string, now = Date.now()): void {
    const lockedUntil = this.#failures.get(subject)?.lockedUntil ?? 0;
    if (lockedUntil > now) throw new TooManyAttempts(Math.ceil((lockedUntil - now) / 1000));
  }

  recordFailure(subject: string, now = Date.now()): void {
    const count = (this.#failures.get(subject)?.count ?? 0) + 1;
    const delaySeconds =
      count < FREE_ATTEMPTS ? 0 : Math.min(2 ** (count - FREE_ATTEMPTS), MAX_DELAY_SECONDS);
    this.#failures.set(subject, { count, lockedUntil: now + delaySeconds * 1000 });
  }

  recordSuccess(subject: string): void {
    this.#failures.delete(subject);
  }
}
