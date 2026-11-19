import type { KeyValue } from "@shared/models/request";
import { toPostmanRows } from "./postman-rows";
import type { PostmanUrl } from "./postman-shapes";

/**
 * A URL as Postman stores it: the raw text plus its parts. "{{baseUrl}}/cart/:id?x=1" →
 * host ["{{baseUrl}}"], path ["cart", ":id"], the query rows and the path variable rows.
 */
export function toPostmanUrl(
  raw: string,
  rows: { params: readonly KeyValue[]; pathVariables: readonly KeyValue[] },
): PostmanUrl {
  if (raw.trim() === "") return { raw };
  const beforeQuery = raw.split(/[?#]/)[0] ?? "";
  const protocol = /^([a-z][a-z0-9+.-]*):\/\//i.exec(beforeQuery);
  const rest = protocol === null ? beforeQuery : beforeQuery.slice(protocol[0].length);
  const [authority = "", ...path] = rest.split("/");
  return {
    raw,
    ...(protocol === null ? {} : { protocol: protocol[1] ?? "" }),
    ...splitAuthority(authority),
    ...(path.length === 0 ? {} : { path }),
    ...urlRows(rows),
  };
}

/** The query rows and the path variable rows (Postman marks path variables as type "string"). */
function urlRows(rows: {
  params: readonly KeyValue[];
  pathVariables: readonly KeyValue[];
}): Partial<PostmanUrl> {
  const query = rows.params.length === 0 ? {} : { query: toPostmanRows(rows.params) };
  const variable = toPostmanRows(rows.pathVariables, { type: "string" });
  return variable.length === 0 ? query : { ...query, variable };
}

/** "api.example.com:8080" → host ["api", "example", "com"], port "8080"; "{{baseUrl}}" stays one part. */
function splitAuthority(authority: string): { host: string[]; port?: string } {
  if (authority.includes("{{")) return { host: [authority] };
  const portMatch = /:(\d+)$/.exec(authority);
  const hostText = portMatch === null ? authority : authority.slice(0, portMatch.index);
  return { host: hostText.split("."), ...(portMatch === null ? {} : { port: portMatch[1] ?? "" }) };
}
