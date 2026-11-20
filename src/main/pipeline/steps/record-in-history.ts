import type { RequestAuth } from "@shared/models/auth";
import type { KeyValue, RequestDefinition } from "@shared/models/request";
import { REDACTED, SENSITIVE_NAME } from "../../http/sensitive-names";
import { HistoryRepository } from "../../storage/repositories/history-repository";
import type { WorkspaceService } from "../../workspaces/workspace-service";
import type { RequestContext } from "../request-context";

/**
 * Stores the request as the user wrote it (with {{variables}}, never their values),
 * with credential-looking headers, query values and URL user-info redacted.
 * Runs for failed requests too (status null).
 */
export function recordInHistory(workspaces: WorkspaceService): (context: RequestContext) => void {
  return (context) => {
    const database = workspaces.requireUnlockedDatabase(context.input.workspaceId);
    new HistoryRepository(database).add({
      sentAt: context.sentAt,
      status: context.response?.status ?? null,
      durationMs: context.response?.timings.total ?? null,
      definition: redactDefinition(context.input.definition),
    });
  };
}

/** Only what was sent: the body types not in use are left out. */
function redactDefinition(definition: RequestDefinition): RequestDefinition {
  return {
    ...definition,
    otherBodies: undefined,
    url: redactUrl(definition.url),
    params: redactRows(definition.params),
    headers: redactRows(definition.headers),
    auth: redactAuth(definition.auth),
  };
}

/** Credentials typed straight into the auth tab are redacted; a pure {{variable}} reference is kept. */
function redactAuth(auth: RequestAuth): RequestAuth {
  const redacted: Record<string, unknown> = { ...auth };
  for (const field of AUTH_CREDENTIAL_FIELDS) {
    const value = redacted[field];
    if (typeof value === "string" && value !== "" && !VARIABLE_ONLY.test(value)) redacted[field] = REDACTED;
  }
  return redacted as RequestAuth;
}

const AUTH_CREDENTIAL_FIELDS = ["password", "token", "value", "secretKey", "sessionToken", "secret"];
const VARIABLE_ONLY = /^\s*\{\{[^{}]+\}\}\s*$/;

function redactRows(rows: KeyValue[]): KeyValue[] {
  return rows.map((row) => (SENSITIVE_NAME.test(row.key) ? { ...row, value: REDACTED } : row));
}

/** Works on the raw text so {{variables}} survive untouched. */
function redactUrl(url: string): string {
  const withoutUserInfo = url.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@?#]*@/i, "$1");
  return withoutUserInfo.replace(/([?&])([^=&#]*)=([^&#]*)/g, (match, separator: string, name: string) =>
    SENSITIVE_NAME.test(name) ? `${separator}${name}=${REDACTED}` : match,
  );
}
