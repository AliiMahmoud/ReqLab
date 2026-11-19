import { ImportFailed } from "../errors";
import { MAX_JSON_DEPTH } from "./import-limits";

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Parses JSON from an untrusted file. Keys that could reach an object's prototype are dropped,
 * and nesting deeper than MAX_JSON_DEPTH is refused (it would only exist to exhaust the stack).
 */
export function parseUntrustedJson(text: string, fileName: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text, (key, value: unknown) => (DANGEROUS_KEYS.has(key) ? undefined : value));
  } catch {
    throw new ImportFailed(`"${fileName}" is not valid JSON.`);
  }
  if (depthOf(parsed) > MAX_JSON_DEPTH) throw new ImportFailed(`"${fileName}" is nested too deeply.`);
  return parsed;
}

/** Iterative, so a hostile file cannot overflow the stack while being measured. */
function depthOf(root: unknown): number {
  let deepest = 0;
  const pending: [unknown, number][] = [[root, 1]];
  while (pending.length > 0) {
    const [value, depth] = pending.pop() ?? [undefined, 0];
    if (typeof value !== "object" || value === null) continue;
    deepest = Math.max(deepest, depth);
    if (deepest > MAX_JSON_DEPTH) return deepest;
    for (const child of Object.values(value)) pending.push([child, depth + 1]);
  }
  return deepest;
}
