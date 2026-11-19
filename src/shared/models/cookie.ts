import { z } from "zod";
import { WorkspaceScoped } from "./collection";

export const StoredCookie = z.object({
  domain: z.string().max(255),
  path: z.string().max(1_024),
  name: z.string().max(4_096),
  value: z.string().max(8_192),
  /** ISO time; null for a session cookie (kept until cleared, since ReqLab has no browsing session). */
  expiresAt: z.iso.datetime().nullable(),
  isSecure: z.boolean(),
  isHttpOnly: z.boolean(),
  sameSite: z.string().max(16).nullable(),
  /** Set without Domain=: sent only to exactly this host, not its subdomains. */
  isHostOnly: z.boolean(),
});
export type StoredCookie = z.infer<typeof StoredCookie>;

export const CookieKeyInput = WorkspaceScoped.extend({
  domain: z.string().max(255),
  path: z.string().max(1_024),
  name: z.string().max(4_096),
});
