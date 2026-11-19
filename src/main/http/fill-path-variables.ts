import type { KeyValue } from "@shared/models/request";

const PATH_VARIABLE = /\/:([A-Za-z_][\w.-]*)/g;

/**
 * Postman-style path variables: "/orders/:id" + { id: "42" } → "/orders/42". Only the path is touched
 * (not the query or fragment); values are percent-encoded; names without an enabled value stay as written.
 */
export function fillPathVariables(url: string, variables: readonly KeyValue[] | undefined): string {
  const values = new Map(
    (variables ?? []).filter((row) => row.isEnabled && row.key !== "").map((row) => [row.key, row.value]),
  );
  if (values.size === 0) return url;
  const end = url.search(/[?#]/);
  const path = end === -1 ? url : url.slice(0, end);
  const rest = end === -1 ? "" : url.slice(end);
  const filled = path.replace(PATH_VARIABLE, (segment, name: string) => {
    const value = values.get(name);
    return value === undefined ? segment : `/${encodeURIComponent(value)}`;
  });
  return filled + rest;
}
