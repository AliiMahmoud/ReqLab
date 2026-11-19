import type { BodyType, RequestBody } from "@shared/models/request";
import { encodeFormDataBody } from "./encode-form-data-body";
import { encodeGraphqlBody } from "./encode-graphql-body";
import { encodeJsonBody } from "./encode-json-body";
import { encodeRawBody } from "./encode-raw-body";
import { encodeUrlencodedBody } from "./encode-urlencoded-body";
import type { EncodedBody } from "./encoded-body";

type BodyEncoder<T extends BodyType> = (body: Extract<RequestBody, { type: T }>) => EncodedBody | undefined;

/** One line per body type. A new body type = one encoder file + one line here. */
const bodyEncoders: { [T in BodyType]: BodyEncoder<T> } = {
  none: () => undefined,
  json: encodeJsonBody,
  raw: encodeRawBody,
  urlencoded: encodeUrlencodedBody,
  "form-data": encodeFormDataBody,
  graphql: encodeGraphqlBody,
};

export function encodeBody(body: RequestBody): EncodedBody | undefined {
  const encoder = bodyEncoders[body.type] as BodyEncoder<typeof body.type>;
  return encoder(body);
}
