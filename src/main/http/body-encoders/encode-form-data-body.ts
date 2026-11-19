import { randomBytes } from "node:crypto";
import type { KeyValue } from "@shared/models/request";
import type { EncodedBody } from "./encoded-body";

/** multipart/form-data with text fields. File fields need a main-side file picker (later phase). */
export function encodeFormDataBody(body: { fields: KeyValue[] }): EncodedBody {
  const boundary = `----ReqLabBoundary${randomBytes(12).toString("hex")}`;
  const parts = body.fields
    .filter((field) => field.isEnabled && field.key !== "")
    .map(
      (field) =>
        `--${boundary}\r\nContent-Disposition: form-data; name="${quote(field.key)}"\r\n\r\n${field.value}\r\n`,
    );
  const text = `${parts.join("")}--${boundary}--\r\n`;
  return { bytes: Buffer.from(text, "utf8"), contentType: `multipart/form-data; boundary=${boundary}` };
}

/** Field names cannot break out of their quoted header value. */
function quote(name: string): string {
  return name.replace(/"/g, "%22").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
