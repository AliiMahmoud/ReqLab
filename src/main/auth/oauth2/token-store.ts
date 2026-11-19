import { z } from "zod";
import type { OAuth2TokenStatus } from "@shared/models/oauth2";
import type { WorkspaceData } from "../../workspaces/workspace-data";

export const StoredToken = z.object({
  accessToken: z.string().min(1).max(16_384),
  tokenType: z.string().max(64),
  refreshToken: z.string().max(16_384).nullable(),
  expiresAt: z.iso.datetime().nullable(),
  scope: z.string().max(4_096).nullable(),
});
export type StoredToken = z.infer<typeof StoredToken>;

/** A token counts as expired 30 seconds early, so it does not lapse mid-request. */
const EXPIRY_MARGIN_MS = 30_000;

/** OAuth tokens, kept in the encrypted workspace file (settings table). Never sent to the UI. */
export class OAuth2TokenStore {
  constructor(private readonly data: WorkspaceData) {}

  read(workspaceId: string, key: string): StoredToken | undefined {
    return this.data.settings(workspaceId).read(key, StoredToken);
  }

  write(workspaceId: string, key: string, token: StoredToken): void {
    this.data.settings(workspaceId).write(key, StoredToken.parse(token));
  }

  clear(workspaceId: string, key: string): void {
    this.data.settings(workspaceId).remove(key);
  }

  status(token: StoredToken | undefined): OAuth2TokenStatus {
    return {
      hasToken: token !== undefined && !isExpired(token),
      expiresAt: token?.expiresAt ?? null,
      canRefresh: typeof token?.refreshToken === "string",
      scope: token?.scope ?? null,
    };
  }
}

export function isExpired(token: StoredToken): boolean {
  return token.expiresAt !== null && Date.parse(token.expiresAt) - EXPIRY_MARGIN_MS <= Date.now();
}
