import { duplicateEntry } from "./collection-store";
import { getActiveTab, openDraft, openSavedRequest } from "./tab-store";
import { openWorkspaceId } from "./workspace-store";

/**
 * Cmd/Ctrl+D: duplicates the request in the active tab and opens the copy. A saved request is copied
 * in its collection (right below it); a draft becomes a new draft tab with the same contents.
 */
export async function duplicateActiveRequest(): Promise<void> {
  const tab = getActiveTab();
  const workspaceId = openWorkspaceId.get();
  if (tab === undefined || workspaceId === undefined || tab.container !== undefined) return;
  if (tab.itemId === null) {
    openDraft(structuredClone(tab.draft), `${tab.name} copy`);
    return;
  }
  const copyId = await duplicateEntry(workspaceId, tab.itemId);
  if (copyId !== undefined) await openSavedRequest(workspaceId, copyId);
}
