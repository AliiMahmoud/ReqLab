import { z } from "zod";
import { IMAGE_TYPES } from "../image-types";
import { ScriptReport } from "./script-report";
import { EntityId, WorkspaceScoped } from "./collection";
import { KeyValue, RequestDefinition } from "./request";

export const SendRequestInput = WorkspaceScoped.extend({
  /** Chosen by the UI so it can cancel this exact request. */
  requestId: z.uuid(),
  definition: RequestDefinition,
  /** The saved request this tab belongs to, so "inherit" auth can be looked up. Null for drafts. */
  itemId: EntityId.nullable(),
  environmentId: EntityId.nullable(),
  collectionId: EntityId.nullable(),
  /** The user confirmed sending a data-changing request with a protected environment active. */
  confirmedProtected: z.boolean().default(false),
});
export type SendRequestInput = z.infer<typeof SendRequestInput>;

export const CancelRequestInput = z.object({ requestId: z.uuid() });

const Milliseconds = z.number().nonnegative();

/** Time spent in each phase. A phase that did not happen (e.g. TLS over http) is null. */
export const Timings = z.object({
  dns: Milliseconds.nullable(),
  connect: Milliseconds.nullable(),
  tls: Milliseconds.nullable(),
  firstByte: Milliseconds,
  download: Milliseconds,
  total: Milliseconds,
});
export type Timings = z.infer<typeof Timings>;

export const ResponseBodyView = z.object({
  /** UTF-8 text, cut at the display limit. Empty for binary bodies. */
  text: z.string(),
  size: z.number().int().nonnegative(),
  isTruncated: z.boolean(),
  isBinary: z.boolean(),
  contentType: z.string(),
  /** An image response (up to the display limit), shown as a picture. */
  image: z
    .object({
      mimeType: z.enum(IMAGE_TYPES),
      base64: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/),
    })
    .optional(),
});

export const ResponseView = z.object({
  status: z.number().int(),
  statusText: z.string(),
  httpVersion: z.string(),
  /** The final URL after redirects, with secret values masked. */
  url: z.string(),
  redirectCount: z.number().int().nonnegative(),
  headers: z.array(KeyValue.omit({ isEnabled: true })),
  body: ResponseBodyView,
  timings: Timings,
  /** Things the user should know about how the request was sent (e.g. a secret over plain http). */
  warnings: z.array(z.string().max(500)).max(20),
  /** pm.test results, console output and script errors (when scripts ran). */
  scripts: ScriptReport.optional(),
});
export type ResponseView = z.infer<typeof ResponseView>;
