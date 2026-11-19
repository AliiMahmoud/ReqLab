import type { RequestTab } from "./request-tab";
import { askToConfirm } from "./confirm-store";
import { closeTab, needsCloseConfirmation, tabs } from "./tab-store";

/** The tab menu's bulk actions, relative to the tab that was right-clicked. */
export type CloseScope = "others" | "left" | "right" | "all";

export function tabsToClose(tabId: string, scope: CloseScope): RequestTab[] {
  const all = tabs.get();
  const index = all.findIndex((tab) => tab.id === tabId);
  if (index === -1) return [];
  if (scope === "left") return all.slice(0, index);
  if (scope === "right") return all.slice(index + 1);
  return scope === "all" ? all : all.filter((tab) => tab.id !== tabId);
}

/**
 * Closes several tabs with one question for all their unsaved changes (not one per tab).
 * Each closed tab can still come back with Reopen Closed Tab.
 */
export async function closeTabsAround(tabId: string, scope: CloseScope): Promise<void> {
  const targets = tabsToClose(tabId, scope);
  const unsavedCount = targets.filter(needsCloseConfirmation).length;
  if (unsavedCount > 0 && !(await confirmClosingMany(unsavedCount))) return;
  for (const tab of targets) await closeTab(tab.id, { isConfirmed: true });
}

function confirmClosingMany(count: number): Promise<boolean> {
  const tabsWord = count === 1 ? "1 tab has" : `${String(count)} tabs have`;
  return askToConfirm({
    kind: "close-unsaved-tabs",
    title: `Close without saving? ${tabsWord} unsaved changes.`,
    message: "Their unsaved changes are kept in Reopen Closed Tab until ReqLab quits.",
    confirmLabel: "Close without saving",
    isDanger: false,
  });
}
