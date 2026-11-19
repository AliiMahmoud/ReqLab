import type { KeyValue } from "@shared/models/request";
import type { PostmanRow } from "./postman-shapes";

/** ReqLab rows → Postman rows: a description only when there is one, "disabled" only when off. */
export function toPostmanRows(rows: readonly KeyValue[], extra: { type?: string } = {}): PostmanRow[] {
  return rows.map((row) => ({
    key: row.key,
    value: row.value,
    ...extra,
    ...(row.description === undefined || row.description === "" ? {} : { description: row.description }),
    ...(row.isEnabled ? {} : { disabled: true as const }),
  }));
}
