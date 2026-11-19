import type { EncodedBody } from "./encoded-body";

export function encodeJsonBody(body: { text: string }): EncodedBody {
  return { bytes: Buffer.from(body.text, "utf8"), contentType: "application/json" };
}
