import type { KeyValue } from "@shared/models/request";
import type { EncodedBody } from "./encoded-body";

export function encodeUrlencodedBody(body: { fields: KeyValue[] }): EncodedBody {
  const text = body.fields
    .filter((field) => field.isEnabled && field.key !== "")
    .map((field) => `${encodeURIComponent(field.key)}=${encodeURIComponent(field.value)}`)
    .join("&");
  return { bytes: Buffer.from(text, "utf8"), contentType: "application/x-www-form-urlencoded" };
}
