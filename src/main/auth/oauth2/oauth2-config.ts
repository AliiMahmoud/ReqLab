import { createHash } from "node:crypto";
import type { RequestAuth } from "@shared/models/auth";

export type OAuth2Config = Extract<RequestAuth, { type: "oauth2" }>;

/** One cached token per distinct server, client, scope, grant and user (secrets excluded from the key). */
export function tokenCacheKey(config: OAuth2Config): string {
  const identity = [config.grantType, config.tokenUrl, config.clientId, config.scope, config.username].join(
    "\n",
  );
  return `oauth2-token:${createHash("sha256").update(identity).digest("hex")}`;
}
