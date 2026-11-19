import type { OAuth2Input } from "@shared/models/oauth2";
import { RequestFailed } from "../errors";
import type { OAuth2Config } from "../auth/oauth2/oauth2-config";
import type { IpcRouter } from "./ipc-router";
import type { IpcServices } from "./ipc-services";

export function registerOAuth2Handlers(router: IpcRouter, { oauth2, variables }: IpcServices): void {
  /** The UI sends the auth as typed; main resolves its {{variables}} (secrets stay here). */
  const resolvedConfig = (input: OAuth2Input): OAuth2Config => {
    if (input.auth.type !== "oauth2") throw new RequestFailed("This is not an OAuth 2.0 configuration.");
    const { resolver } = variables.resolveScopes(input.workspaceId, input);
    const resolved: Record<string, unknown> = { ...input.auth };
    for (const [field, value] of Object.entries(input.auth)) {
      if (field !== "type" && field !== "grantType" && typeof value === "string")
        resolved[field] = resolver.resolve(value);
    }
    return resolved as OAuth2Config;
  };
  router.handle("oauth2:status", (input) => oauth2.status(input.workspaceId, resolvedConfig(input)));
  router.handle("oauth2:get-token", (input) => oauth2.fetchNew(input.workspaceId, resolvedConfig(input)));
  router.handle("oauth2:clear", (input) => oauth2.clear(input.workspaceId, resolvedConfig(input)));
}
