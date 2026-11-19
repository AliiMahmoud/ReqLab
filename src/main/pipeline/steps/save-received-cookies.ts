import { parseSetCookie } from "../../cookies/parse-set-cookie";
import type { RequestSettingsStore } from "../../network/request-settings-store";
import type { WorkspaceData } from "../../workspaces/workspace-data";
import { requireValue, type PipelineStep } from "../request-context";

/** Stores the response's Set-Cookie headers in the workspace jar (invalid or foreign ones are ignored). */
export function saveReceivedCookies(
  data: WorkspaceData,
  requestSettings: RequestSettingsStore,
): PipelineStep {
  return (context) => {
    if (requestSettings.read(context.input.workspaceId).disableCookies) return;
    const response = requireValue(context.response, "saveReceivedCookies");
    const jar = data.cookies(context.input.workspaceId);
    const now = new Date();
    for (const [name, value] of response.headers) {
      if (name.toLowerCase() !== "set-cookie") continue;
      const cookie = parseSetCookie(value, response.url, now);
      if (cookie !== undefined) jar.save(cookie, now);
    }
  };
}
