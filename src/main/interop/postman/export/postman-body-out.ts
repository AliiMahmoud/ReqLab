import type { RequestBody } from "@shared/models/request";
import { toPostmanRows } from "./postman-rows";

const RAW_LANGUAGES: [pattern: RegExp, language: string][] = [
  [/json/i, "json"],
  [/xml/i, "xml"],
  [/html/i, "html"],
  [/javascript/i, "javascript"],
];

type BodyOf<T extends RequestBody["type"]> = Extract<RequestBody, { type: T }>;

const CONVERTERS: { [T in RequestBody["type"]]: (body: BodyOf<T>) => Record<string, unknown> | undefined } = {
  none: () => undefined,
  json: (body) => rawBody(body.text, "json"),
  raw: (body) =>
    rawBody(body.text, RAW_LANGUAGES.find(([pattern]) => pattern.test(body.contentType))?.[1] ?? "text"),
  urlencoded: (body) => ({ mode: "urlencoded", urlencoded: toPostmanRows(body.fields) }),
  "form-data": (body) => ({ mode: "formdata", formdata: toPostmanRows(body.fields, { type: "text" }) }),
  graphql: (body) => ({ mode: "graphql", graphql: { query: body.query, variables: body.variables } }),
};

/** ReqLab body → Postman body (left out for "none", as Postman does). */
export function toPostmanBody(body: RequestBody): Record<string, unknown> | undefined {
  const convert = CONVERTERS[body.type] as (body: RequestBody) => Record<string, unknown> | undefined;
  return convert(body);
}

function rawBody(text: string, language: string): Record<string, unknown> {
  return { mode: "raw", raw: text, options: { raw: { language } } };
}
