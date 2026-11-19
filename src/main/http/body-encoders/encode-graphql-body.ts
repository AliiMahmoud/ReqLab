import { RequestFailed } from "../../errors";
import type { EncodedBody } from "./encoded-body";

export function encodeGraphqlBody(body: { query: string; variables: string }): EncodedBody {
  const payload = { query: body.query, variables: parseVariables(body.variables) };
  return { bytes: Buffer.from(JSON.stringify(payload), "utf8"), contentType: "application/json" };
}

function parseVariables(text: string): unknown {
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestFailed("The GraphQL variables are not valid JSON.");
  }
}
