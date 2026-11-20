import { z } from "zod";
import { WorkspaceScoped } from "./collection";

/** Settings › General › Request, per workspace. */
export const RequestSettings = z.object({
  /** For the whole request (connect, send, receive); 0 = no timeout. Up to one hour. */
  timeoutMs: z.number().int().min(0).max(3_600_000),
  /** Bigger responses are stopped; kept in memory, so it is capped. */
  maxResponseMb: z.number().int().min(1).max(1024),
  /** Off: a 3xx response is shown as it is, with its Location header. */
  followRedirects: z.boolean(),
  /** Off: cookies are neither sent from nor saved into the jar. */
  disableCookies: z.boolean(),
  /** The same switch as Network › Verify server certificates. */
  verifyTls: z.boolean(),
});
export type RequestSettings = z.infer<typeof RequestSettings>;

export const UpdateRequestSettingsInput = WorkspaceScoped.extend({ settings: RequestSettings });
