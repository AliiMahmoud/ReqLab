import { z } from "zod";

export const SecurityStatus = z.object({
  /** Which OS facility protects workspace keys (e.g. "keychain", "dpapi", "gnome_libsecret", "basic_text"). */
  keyProtection: z.string(),
  /** True when the OS offers no real key protection, so every workspace needs a master password. */
  isMasterPasswordRequired: z.boolean(),
});
export type SecurityStatus = z.infer<typeof SecurityStatus>;
