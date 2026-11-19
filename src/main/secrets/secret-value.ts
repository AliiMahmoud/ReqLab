import { inspect } from "node:util";

const MASK = "••••••";

/**
 * Wraps a secret so it cannot leak by accident: printing, logging, JSON-serialising
 * or inspecting it all show a mask. Only an explicit reveal() returns the real value.
 */
export class SecretValue {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return MASK;
  }

  toJSON(): string {
    return MASK;
  }

  [inspect.custom](): string {
    return `SecretValue(${MASK})`;
  }
}
