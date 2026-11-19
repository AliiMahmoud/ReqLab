import { HttpMethod, RequestDefinition, type KeyValue } from "@shared/models/request";
import { convertPostmanAuth } from "./convert-postman-auth";
import { convertPostmanBody, convertRows } from "./convert-postman-body";
import { asDescription, asRecord, asText } from "./postman-values";

type Warn = (message: string) => void;

/**
 * One Postman request → a ReqLab request definition. Its auth stays auth ("inherit" when it has none).
 * Returns undefined (and warns) when the result does not fit ReqLab's limits.
 */
export function convertPostmanRequest(request: unknown, warn: Warn): RequestDefinition | undefined {
  const block = asRecord(request) ?? { url: request };
  const pathVariables = convertRows(asRecord(block["url"])?.["variable"], warn);
  const description = asDescription(block["description"]);
  const parsed = RequestDefinition.safeParse({
    method: readMethod(block["method"], warn),
    url: readUrl(block["url"]),
    params: readQueryParams(block["url"], warn),
    headers: readHeaders(block["header"], warn),
    body: convertPostmanBody(block["body"], warn),
    auth: convertPostmanAuth(block["auth"], warn),
    ...(pathVariables.length === 0 ? {} : { pathVariables }),
    ...(description === "" ? {} : { description }),
  });
  if (!parsed.success) warn("A request exceeded ReqLab's size limits and was skipped");
  return parsed.success ? parsed.data : undefined;
}

function readMethod(method: unknown, warn: Warn): string {
  const text = asText(method).trim().toUpperCase();
  if (text === "") return "GET";
  if (HttpMethod.safeParse(text).success) return text;
  warn(`The method "${text.slice(0, 30)}" is not valid and was replaced by GET`);
  return "GET";
}

/** Collection v2 URLs are either a string or an object whose "raw" holds the full text. */
function readUrl(url: unknown): string {
  if (typeof url === "string") return url;
  const block = asRecord(url);
  return asText(block?.["raw"]);
}

function readQueryParams(url: unknown, warn: Warn): KeyValue[] {
  return convertRows(asRecord(url)?.["query"], warn);
}

/** Headers are an array of rows, or (older exports) one "Name: value" per line. */
function readHeaders(header: unknown, warn: Warn): KeyValue[] {
  if (typeof header !== "string") return convertRows(header, warn).filter((row) => row.key !== "");
  return header.split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf(":");
    if (separator <= 0) return [];
    return [
      { key: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim(), isEnabled: true },
    ];
  });
}
