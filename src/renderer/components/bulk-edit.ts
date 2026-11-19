import type { KeyValue } from "@shared/models/request";

const DISABLED_PREFIX = "//";

/**
 * Rows as Postman's bulk-edit text: one "key:value" per line, "//" in front of a disabled row.
 * Descriptions do not appear in the text; fromBulkText keeps them for keys that are still there.
 */
export function toBulkText(rows: readonly KeyValue[]): string {
  return rows
    .filter((row) => row.key !== "" || row.value !== "")
    .map((row) => `${row.isEnabled ? "" : DISABLED_PREFIX}${row.key}:${row.value}`)
    .join("\n");
}

export function fromBulkText(text: string, previous: readonly KeyValue[]): KeyValue[] {
  const descriptions = new Map(previous.map((row) => [row.key, row.description]));
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const isEnabled = !line.trimStart().startsWith(DISABLED_PREFIX);
      // "// //key:value" (commented twice by a toggle over mixed lines) is still just disabled.
      const content = isEnabled ? line : line.trimStart().replace(/^(\/\/\s*)+/, "");
      const separator = content.indexOf(":");
      const key = (separator === -1 ? content : content.slice(0, separator)).trim();
      const value = separator === -1 ? "" : content.slice(separator + 1).trim();
      const description = descriptions.get(key);
      return description === undefined ? { key, value, isEnabled } : { key, value, isEnabled, description };
    });
}
