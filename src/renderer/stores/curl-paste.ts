import type { RequestDefinition } from "@shared/models/request";
import { api } from "../api";
import { callApi, showNotice } from "./notice-store";
import { paramsFromUrl, pathVariablesFromUrl } from "./query-sync";
import { findTab, updateDraft } from "./tab-store";

/** True for text that starts like a cURL command ("curl …", "curl.exe …"). */
export function looksLikeCurl(text: string): boolean {
  return /^\s*curl(\.exe)?\s/i.test(text);
}

/**
 * Replaces the tab's request with a pasted cURL command (parsed in main): method, URL, params,
 * headers, auth and body. Without auth in the command, the tab keeps its own.
 */
export async function pasteCurlIntoTab(tabId: string, text: string): Promise<void> {
  const parsed = await callApi(api.parseCurl({ text }));
  const tab = findTab(tabId);
  if (parsed === undefined || tab === undefined) return;
  const { definition } = parsed;
  const change: RequestDefinition = {
    ...definition,
    params: paramsFromUrl(definition.url, []),
    pathVariables: pathVariablesFromUrl(definition.url, undefined),
    auth: definition.auth.type === "none" ? tab.draft.auth : definition.auth,
  };
  updateDraft(tabId, change);
  const note = parsed.warnings.length === 0 ? "" : ` Not imported: ${parsed.warnings.join(" ")}`;
  showNotice(`Imported from cURL.${note}`, parsed.warnings.length > 0);
}
