import { MAX_DESCRIPTION_LENGTH } from "@shared/limits";
/** Postman files mix strings, numbers, booleans and nulls in value fields; ReqLab stores text. */
export function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** A name for a collection, folder or request: trimmed, never empty, within the length limit. */
export function asName(value: unknown, fallback: string): string {
  const name = asText(value).trim().slice(0, 200);
  return name === "" ? fallback : name;
}

/**
 * Reads one setting of an auth block. Collection v2.1 stores them as [{ key, value }],
 * v2.0 as a plain object.
 */
export function readAuthSetting(section: unknown, name: string): string {
  const entry = asArray(section).find((item) => asRecord(item)?.["key"] === name);
  if (entry !== undefined) return asText(asRecord(entry)?.["value"]);
  return asText(asRecord(section)?.[name]);
}

/** Postman descriptions are a string or { content, type }; anything else counts as none. */
export function asDescription(value: unknown): string {
  if (typeof value === "string") return value.slice(0, MAX_DESCRIPTION_LENGTH);
  return asText(asRecord(value)?.["content"]).slice(0, MAX_DESCRIPTION_LENGTH);
}
