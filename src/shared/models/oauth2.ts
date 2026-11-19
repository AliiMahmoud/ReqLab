import { z } from "zod";
import { RequestAuth } from "./auth";
import { EntityId, WorkspaceScoped } from "./collection";

/** The OAuth settings being edited, plus where variables come from. */
export const OAuth2Input = WorkspaceScoped.extend({
  auth: RequestAuth,
  environmentId: EntityId.nullable(),
  collectionId: EntityId.nullable(),
});
export type OAuth2Input = z.infer<typeof OAuth2Input>;

/** What the UI may know about a cached token: never the token itself. */
export const OAuth2TokenStatus = z.object({
  hasToken: z.boolean(),
  expiresAt: z.iso.datetime().nullable(),
  canRefresh: z.boolean(),
  scope: z.string().nullable(),
});
export type OAuth2TokenStatus = z.infer<typeof OAuth2TokenStatus>;
