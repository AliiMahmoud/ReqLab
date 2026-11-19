import type { EncodedBody } from "./encoded-body";

export function encodeRawBody(body: { text: string; contentType: string }): EncodedBody {
  const contentType = body.contentType.trim() === "" ? "text/plain" : body.contentType.trim();
  return { bytes: Buffer.from(body.text, "utf8"), contentType };
}
