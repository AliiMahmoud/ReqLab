import { z } from "zod";
import { MAX_OPEN_TABS, MAX_PERSISTED_RESPONSE_TEXT } from "../limits";
import { EntityId, EntityName, WorkspaceScoped } from "./collection";
import { ResponseBodyView, ResponseView } from "./http-exchange";
import { RequestDefinition } from "./request";

/** A response small enough to keep with its tab. Bigger ones are dropped and need a resend. */
const PersistedResponse = ResponseView.extend({
  body: ResponseBodyView.extend({ text: z.string().max(MAX_PERSISTED_RESPONSE_TEXT) }),
});

/**
 * One open tab exactly as the user left it: unsaved edits, drafts, chosen sub-tabs and the last response.
 * Stored in the encrypted workspace file, like everything else in a workspace.
 */
export const PersistedTab = z.object({
  /** Null for a draft that was never saved. */
  itemId: EntityId.nullable(),
  name: EntityName,
  draft: RequestDefinition,
  editorSection: z.enum(["params", "headers", "body", "auth", "scripts"]),
  responseSection: z.enum(["body", "headers", "timing", "tests"]),
  bodyView: z.enum(["pretty", "raw", "preview"]),
  response: PersistedResponse.nullable(),
  error: z.string().max(2_000).nullable(),
});
export type PersistedTab = z.infer<typeof PersistedTab>;

export const OpenTabs = z.object({
  tabs: z.array(PersistedTab).max(MAX_OPEN_TABS),
  activeIndex: z.number().int().nonnegative().nullable(),
  environmentId: EntityId.nullable(),
});
export type OpenTabs = z.infer<typeof OpenTabs>;

/** What the first Phase 1 build stored: only the ids of saved requests. Read once, then replaced. */
export const LegacyOpenTabs = z.object({
  itemIds: z.array(EntityId).max(MAX_OPEN_TABS),
  activeItemId: EntityId.nullable(),
  environmentId: EntityId.nullable(),
});

export const SaveOpenTabsInput = WorkspaceScoped.extend({ openTabs: OpenTabs });
