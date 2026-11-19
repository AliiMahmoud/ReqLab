import { cookieHeaderFor } from "../../cookies/cookies-for-request";
import { findHeader } from "../../http/http-types";
import type { RequestSettingsStore } from "../../network/request-settings-store";
import type { WorkspaceData } from "../../workspaces/workspace-data";
import { requireValue, type PipelineStep } from "../request-context";

/** Sends the jar's matching cookies, unless the user wrote a Cookie header by hand (that one wins). */
export function attachCookies(data: WorkspaceData, requestSettings: RequestSettingsStore): PipelineStep {
  return (context) => {
    if (requestSettings.read(context.input.workspaceId).disableCookies) return;
    const prepared = requireValue(context.prepared, "attachCookies");
    if (findHeader(prepared.headers, "cookie") !== undefined) return;
    const header = cookieHeaderFor(prepared.url, data.cookies(context.input.workspaceId).list(new Date()));
    if (header !== undefined)
      context.prepared = { ...prepared, headers: [...prepared.headers, ["Cookie", header]] };
  };
}
