import { randomInt, randomUUID } from "node:crypto";

/** Postman-compatible dynamic values. Each {{$name}} occurrence gets a fresh value. */
const DYNAMIC_VALUES: Record<string, () => string> = {
  $guid: () => randomUUID(),
  $randomUUID: () => randomUUID(),
  $timestamp: () => String(Math.floor(Date.now() / 1000)),
  $isoTimestamp: () => new Date().toISOString(),
  $randomInt: () => String(randomInt(0, 1001)),
};

export function createDynamicValue(name: string): string | undefined {
  return Object.hasOwn(DYNAMIC_VALUES, name) ? DYNAMIC_VALUES[name]?.() : undefined;
}

export function listDynamicVariableNames(): string[] {
  return Object.keys(DYNAMIC_VALUES);
}
