import type { KeyValue } from "@shared/models/request";
import { decodeQueryPart, encodeQueryPart } from "@shared/query-encoding";

/**
 * Keeps the URL's query string and the Params table in step, both ways.
 * Params are stored as they are in the URL (encoded), so the URL, cURL and exports agree; only the
 * table shows them decoded (paramsForTable / paramsFromTable). Disabled params live only in the
 * table, and descriptions follow their key.
 */
export function paramsFromUrl(url: string, previous: readonly KeyValue[]): KeyValue[] {
  const queryStart = url.indexOf("?");
  const query = queryStart === -1 ? "" : (url.slice(queryStart + 1).split("#")[0] ?? "");
  const descriptions = new Map(previous.map((param) => [param.key, param.description]));
  const enabled = (query === "" ? [] : query.split("&").map(parsePair)).map((param) => {
    const description = descriptions.get(param.key);
    return description === undefined ? param : { ...param, description };
  });
  return [...enabled, ...previous.filter((param) => !param.isEnabled)];
}

const PATH_VARIABLE = /\/:([A-Za-z_][\w.-]*)/g;

/**
 * The Path Variables rows for a URL's ":name" segments, in order. Rows for names still in the URL keep
 * their value and description; rows for names that left the URL go. Undefined when there are none.
 */
export function pathVariablesFromUrl(
  url: string,
  previous: readonly KeyValue[] | undefined,
): KeyValue[] | undefined {
  const path = url.split(/[?#]/)[0] ?? "";
  const names = [...new Set([...path.matchAll(PATH_VARIABLE)].map((match) => match[1] ?? ""))];
  if (names.length === 0) return undefined;
  const kept = new Map((previous ?? []).map((row) => [row.key, row]));
  return names.map((key) => kept.get(key) ?? { key, value: "", isEnabled: true });
}

export function urlWithParams(url: string, params: readonly KeyValue[]): string {
  const [withoutHash, hash] = splitOnce(url, "#");
  const [base] = splitOnce(withoutHash, "?");
  const query = params
    .filter((param) => param.isEnabled && (param.key !== "" || param.value !== ""))
    .map((param) => (param.value === "" ? param.key : `${param.key}=${param.value}`))
    .join("&");
  return `${base}${query === "" ? "" : `?${query}`}${hash === undefined ? "" : `#${hash}`}`;
}

/** The params as the table shows them: keys and values decoded ("hello%20world" → "hello world"). */
export function paramsForTable(params: readonly KeyValue[]): KeyValue[] {
  return params.map((param) => ({
    ...param,
    key: decodeQueryPart(param.key),
    value: decodeQueryPart(param.value),
  }));
}

/**
 * The table's rows back as stored: a row whose key or value the user changed is encoded for the
 * URL; any other keeps its exact text (so editing one param never changes how another is written).
 */
export function paramsFromTable(rows: readonly KeyValue[], stored: readonly KeyValue[]): KeyValue[] {
  return rows.map((row, index) => {
    const before = stored[index];
    const isTextUnchanged =
      before !== undefined &&
      decodeQueryPart(before.key) === row.key &&
      decodeQueryPart(before.value) === row.value;
    return isTextUnchanged
      ? { ...row, key: before.key, value: before.value }
      : { ...row, key: encodeQueryPart(row.key), value: encodeQueryPart(row.value) };
  });
}

function parsePair(pair: string): KeyValue {
  const [key, value] = splitOnce(pair, "=");
  return { key, value: value ?? "", isEnabled: true };
}

function splitOnce(text: string, separator: string): [string, string | undefined] {
  const index = text.indexOf(separator);
  return index === -1 ? [text, undefined] : [text.slice(0, index), text.slice(index + 1)];
}
