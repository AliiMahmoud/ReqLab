import type { OAuth2Service } from "../../auth/oauth2/oauth2-service";
import { requireValue, type PipelineStep } from "../request-context";

/** OAuth 2.0 becomes a Bearer token: cached, refreshed, or fetched again (never shown to the UI). */
export function obtainOAuth2Token(oauth2: OAuth2Service): PipelineStep {
  return async (context) => {
    const resolved = requireValue(context.resolved, "obtainOAuth2Token");
    if (resolved.auth.type !== "oauth2") return;
    const token = await oauth2.accessToken(context.input.workspaceId, resolved.auth);
    context.resolved = { ...resolved, auth: { type: "bearer", token } };
    const scopes = requireValue(context.scopes, "obtainOAuth2Token");
    context.scopes = { ...scopes, masker: scopes.masker.including(token) };
  };
}
