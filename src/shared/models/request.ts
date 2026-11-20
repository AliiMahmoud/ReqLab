import { z } from "zod";
import {
  MAX_BODY_TEXT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_KEY_LENGTH,
  MAX_KEY_VALUE_ROWS,
  MAX_URL_LENGTH,
  MAX_VALUE_LENGTH,
} from "../limits";
import { RequestAuth } from "./auth";
import { Scripts } from "./scripts";
import { EntityId, WorkspaceScoped } from "./collection";

/** Any HTTP token is allowed (Postman collections use custom verbs), not only the standard ones. */
export const HttpMethod = z.string().regex(/^[A-Za-z]{1,24}$/, "Use letters only.");

export const KeyValue = z.object({
  key: z.string().max(MAX_KEY_LENGTH),
  value: z.string().max(MAX_VALUE_LENGTH),
  isEnabled: z.boolean(),
  /** A note for people (Postman's Description column); never sent. */
  description: z.string().max(MAX_KEY_LENGTH).optional(),
});
export type KeyValue = z.infer<typeof KeyValue>;

const KeyValueList = z.array(KeyValue).max(MAX_KEY_VALUE_ROWS);
const BodyText = z.string().max(MAX_BODY_TEXT_LENGTH);

export const BodyTypes = ["none", "json", "raw", "urlencoded", "form-data", "graphql"] as const;
export type BodyType = (typeof BodyTypes)[number];

export const RequestBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("json"), text: BodyText }),
  z.object({ type: z.literal("raw"), text: BodyText, contentType: z.string().max(200) }),
  z.object({ type: z.literal("urlencoded"), fields: KeyValueList }),
  z.object({ type: z.literal("form-data"), fields: KeyValueList }),
  z.object({ type: z.literal("graphql"), query: BodyText, variables: BodyText }),
]);
export type RequestBody = z.infer<typeof RequestBody>;

/**
 * Everything needed to send a request. The URL holds the query string;
 * `params` mirrors it for the editor and also keeps disabled parameters.
 */
export const RequestDefinition = z.object({
  method: HttpMethod,
  url: z.string().max(MAX_URL_LENGTH),
  params: KeyValueList,
  headers: KeyValueList,
  body: RequestBody,
  /** The other body types' content, so switching type and back restores it. Never sent. */
  otherBodies: z.array(RequestBody).max(BodyTypes.length).optional(),
  /** Requests saved before auth existed have none stored: they inherit. */
  auth: RequestAuth.default({ type: "inherit" }),
  /** Values for ":name" segments of the URL path (Postman's path variables). */
  pathVariables: KeyValueList.optional(),
  /** Pre-request / post-response scripts (Postman's); none when absent. */
  scripts: Scripts.optional(),
  /** Documentation for people; never sent. */
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
});
export type RequestDefinition = z.infer<typeof RequestDefinition>;

export const RequestItemInput = WorkspaceScoped.extend({ itemId: EntityId });
export const SaveRequestInput = RequestItemInput.extend({ definition: RequestDefinition });
