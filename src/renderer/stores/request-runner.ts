import type { ResponseView } from "@shared/models/http-exchange";
import type { Result } from "@shared/result";
import { api } from "../api";
import { findTreeItem } from "./collection-store";
import { askToConfirm } from "./confirm-store";
import { expandResponse } from "./layout-store";
import { activeEnvironmentId, refreshVisibleVariables } from "./environment-store";
import { loadHistory } from "./history-store";
import { showNotice } from "./notice-store";
import type { RequestTab } from "./request-tab";
import { findTab, updateTab } from "./tab-store";

/** Sends a tab's request through main. The renderer itself never touches the network. */
export async function sendTab(workspaceId: string, tabId: string): Promise<void> {
  const tab = findTab(tabId);
  if (tab === undefined || tab.sendingRequestId !== undefined) return;
  const requestId = crypto.randomUUID();
  // Cancel puts back what the panel showed before (no "cancelled" message).
  const before = { response: tab.response, error: tab.error };
  expandResponse();
  updateTab(tabId, { sendingRequestId: requestId, error: undefined });
  const result = await sendConfirmingProtected(workspaceId, tab, requestId);
  if (findTab(tabId)?.sendingRequestId !== requestId) return;
  const isCancelled = !result.ok && result.error.code === "request-cancelled";
  updateTab(
    tabId,
    isCancelled
      ? { sendingRequestId: undefined, ...before }
      : { ...describeOutcome(result), lastRequestId: requestId },
  );
  // Scripts may have set variables (pm.environment.set …): highlighting and hover cards follow.
  void refreshVisibleVariables();
  await loadHistory(workspaceId);
}

/** A protected environment asks first; confirmed, the same request is sent again. */
async function sendConfirmingProtected(
  workspaceId: string,
  tab: RequestTab,
  requestId: string,
): Promise<Result<ResponseView>> {
  const result = await sendOnce(workspaceId, tab, { requestId, confirmedProtected: false });
  if (result.ok || result.error.code !== "confirmation-required") return result;
  if (!(await confirmProtected(result.error.message))) return result;
  return sendOnce(workspaceId, tab, { requestId, confirmedProtected: true });
}

function confirmProtected(message: string): Promise<boolean> {
  return askToConfirm({
    kind: "send-protected",
    title: "Send to a protected environment?",
    message,
    confirmLabel: "Send",
    isDanger: true,
  });
}

function sendOnce(
  workspaceId: string,
  tab: RequestTab,
  options: { requestId: string; confirmedProtected: boolean },
): Promise<Result<ResponseView>> {
  return api.sendRequest({
    workspaceId,
    ...options,
    definition: tab.draft,
    itemId: tab.itemId,
    environmentId: activeEnvironmentId.get(),
    collectionId: findTreeItem(tab.itemId)?.collectionId ?? null,
  });
}

function describeOutcome(result: Result<ResponseView>): Partial<RequestTab> {
  if (result.ok) return { sendingRequestId: undefined, response: result.value, error: undefined };
  return { sendingRequestId: undefined, response: undefined, error: result.error.message };
}

export async function cancelTab(tabId: string): Promise<void> {
  const requestId = findTab(tabId)?.sendingRequestId;
  if (requestId === undefined) return;
  await api.cancelRequest({ requestId });
}

/** Copies the active request as a cURL command (built in main, where OAuth tokens stay). */
export async function copyTabAsCurl(workspaceId: string, tabId: string): Promise<void> {
  const tab = findTab(tabId);
  if (tab === undefined) return;
  const result = await api.copyAsCurl({
    workspaceId,
    requestId: crypto.randomUUID(),
    definition: tab.draft,
    itemId: tab.itemId,
    environmentId: activeEnvironmentId.get(),
    collectionId: findTreeItem(tab.itemId)?.collectionId ?? null,
  });
  if (!result.ok) {
    showNotice(result.error.message);
    return;
  }
  const note = result.value.containsSecrets
    ? " It contains an OAuth access token: the clipboard clears in 30 seconds."
    : "";
  showNotice(`Copied as cURL.${note}`, false);
}
