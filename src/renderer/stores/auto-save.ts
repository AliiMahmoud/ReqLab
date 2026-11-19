import { appSettings } from "./app-settings-store";
import { hasUnsavedChanges } from "./request-tab";
import { findTab, saveTab, tabs } from "./tab-store";
import { openWorkspaceId } from "./workspace-store";

const SAVE_DELAY_MS = 250;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Settings › Auto-save: a saved request saves itself shortly after it is edited. Drafts (not in a
 * collection yet) still need Save, since they need a name and a place.
 */
function scheduleSaves(): void {
  if (!appSettings.get().autoSave) return;
  for (const tab of tabs.get()) {
    if (tab.itemId === null || !hasUnsavedChanges(tab)) continue;
    clearTimeout(timers.get(tab.id));
    timers.set(
      tab.id,
      setTimeout(() => void saveIfStillChanged(tab.id), SAVE_DELAY_MS),
    );
  }
}

async function saveIfStillChanged(tabId: string): Promise<void> {
  timers.delete(tabId);
  const tab = findTab(tabId);
  const workspaceId = openWorkspaceId.get();
  if (tab === undefined || workspaceId === undefined || !hasUnsavedChanges(tab)) return;
  await saveTab(workspaceId, tabId);
}

tabs.subscribe(scheduleSaves);
appSettings.subscribe(scheduleSaves);
