import type { KeyValue, RequestBody } from "@shared/models/request";
import { asArray, asRecord, asText } from "./postman-values";

const RAW_LANGUAGE_TYPES: Record<string, string> = {
  text: "text/plain",
  javascript: "application/javascript",
  html: "text/html",
  xml: "application/xml",
};

/** Postman body modes → ReqLab body types. File uploads are reported and left out. */
export function convertPostmanBody(body: unknown, warn: (message: string) => void): RequestBody {
  const block = asRecord(body);
  const mode = asText(block?.["mode"]);
  if (block === undefined || mode === "" || mode === "none") return { type: "none" };
  const converter = BODY_CONVERTERS[mode];
  if (converter !== undefined) return converter(block, warn);
  warn(`A "${mode}" body (file upload) was not imported`);
  return { type: "none" };
}

type BodyConverter = (block: Record<string, unknown>, warn: (message: string) => void) => RequestBody;

const BODY_CONVERTERS: Record<string, BodyConverter> = {
  raw: (block) => convertRaw(block),
  urlencoded: (block, warn) => ({ type: "urlencoded", fields: convertRows(block["urlencoded"], warn) }),
  formdata: (block, warn) => ({ type: "form-data", fields: convertRows(block["formdata"], warn) }),
  graphql: (block) => convertGraphql(block["graphql"]),
};

function convertRaw(block: Record<string, unknown>): RequestBody {
  const text = asText(block["raw"]);
  const language = asText(asRecord(asRecord(block["options"])?.["raw"])?.["language"]);
  if (language === "json") return { type: "json", text };
  return { type: "raw", text, contentType: RAW_LANGUAGE_TYPES[language] ?? "text/plain" };
}

function convertGraphql(graphql: unknown): RequestBody {
  const block = asRecord(graphql);
  return { type: "graphql", query: asText(block?.["query"]), variables: asText(block?.["variables"]) };
}

/** Rows of key/value/disabled. File fields cannot be sent yet, so they are reported. */
export function convertRows(rows: unknown, warn: (message: string) => void): KeyValue[] {
  return asArray(rows).flatMap((row) => {
    const field = asRecord(row);
    if (field === undefined) return [];
    if (field["type"] === "file") {
      warn("A form-data file field was not imported");
      return [];
    }
    const description = asText(field["description"]).slice(0, 1_024);
    const converted: KeyValue = {
      key: asText(field["key"]),
      value: asText(field["value"]),
      isEnabled: field["disabled"] !== true,
    };
    return [description === "" ? converted : { ...converted, description }];
  });
}
