import { z } from "zod";
import { EntityId } from "./collection";
import { RequestDefinition } from "./request";

/** A sent request, stored as written (before variables), with credentials redacted. */
export const HistoryEntry = z.object({
  id: EntityId,
  sentAt: z.iso.datetime(),
  status: z.number().int().nullable(),
  durationMs: z.number().nonnegative().nullable(),
  definition: RequestDefinition,
});
export type HistoryEntry = z.infer<typeof HistoryEntry>;
