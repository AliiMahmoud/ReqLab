import type { PersistedTab } from "@shared/models/open-tabs";
import type { RequestDefinition } from "@shared/models/request";
import { createEmptyRequest } from "@shared/request-defaults";
import { MAX_OPEN_TABS } from "@shared/limits";
import { api } from "../api";
import { collectionTree, findTreeItem } from "./collection-store";
import { activeEnvironmentId } from "./environment-store";
import { shortName } from "../components/short-name";
import { askToChoose } from "./confirm-store";
import { callApi, showNotice } from "./notice-store";
import { createTab, hasUnsavedChanges, type ContainerSection, type RequestTab } from "./request-tab";
import { fromPersistedTab, toPersistedTab } from "./tab-snapshot";
import { signal } from "./signal";
import { forgetDraftHistory, recordDraftEdit } from "./draft-history";

export const tabs = signal<RequestTab[]>([]);
export const activeTabId = signal<string | undefined>(undefined);

export function getActiveTab(): RequestTab | undefined {
  return tabs.get().find((tab) => tab.id === activeTabId.get());
}

export function findTab(tabId: string): RequestTab | undefined {
  return tabs.get().find((tab) => tab.id === tabId);
}

export function updateTab(tabId: string, change: Partial<RequestTab>): void {
  tabs.set(tabs.get().map((tab) => (tab.id === tabId ? { ...tab, ...change } : tab)));
}

/**
 * Changes a tab's request. The change is an undo step of the tab (Cmd/Ctrl+Z), unless it was typed
 * in a code editor, which keeps its own undo history (`isUndoable: false`).
 */
export function updateDraft(
  tabId: string,
  change: Partial<RequestDefinition>,
  { isUndoable = true }: { isUndoable?: boolean } = {},
): void {
  const tab = findTab(tabId);
  if (tab === undefined) return;
  if (isUndoable) recordDraftEdit(tabId, tab.draft, change);
  updateTab(tabId, { draft: { ...tab.draft, ...change } });
}

export async function openSavedRequest(workspaceId: string, itemId: string): Promise<void> {
  const existing = tabs.get().find((tab) => tab.itemId === itemId);
  if (existing !== undefined) {
    activeTabId.set(existing.id);
    return;
  }
  const definition = await callApi(api.getRequest({ workspaceId, itemId }));
  const item = findTreeItem(itemId);
  if (definition === undefined || item === undefined) return;
  addTab(createTab({ itemId, name: item.name, definition }));
}

export function openDraft(
  definition: RequestDefinition = createEmptyRequest(),
  name = "Untitled request",
): void {
  addTab(createTab({ itemId: null, name, definition }));
}

/** Recently closed tabs, newest last, with where they stood, for "Reopen Closed Tab". */
const closedTabs: { tab: RequestTab; index: number }[] = [];
const MAX_CLOSED_TABS = 20;

/** Saves a tab for "Save changes" while closing; true once saved. The request area provides it. */
let saveBeforeClosing: (tabId: string) => Promise<boolean> = () => Promise.resolve(false);

export function handleSaveBeforeClosing(save: (tabId: string) => Promise<boolean>): void {
  saveBeforeClosing = save;
}

/** `isConfirmed`: the caller already asked about unsaved changes (closing several tabs at once). */
export async function closeTab(tabId: string, { isConfirmed = false } = {}): Promise<void> {
  const tab = findTab(tabId);
  if (tab === undefined) return;
  if (!isConfirmed && needsCloseConfirmation(tab) && !(await settleUnsavedChanges(tab))) return;
  removeTab(findTab(tabId) ?? tab);
}

/** Save changes / Don't save / Cancel. True when the tab may close. */
async function settleUnsavedChanges(tab: RequestTab): Promise<boolean> {
  const choice = await askToChoose({
    kind: "close-unsaved-tab",
    title: `Save changes to "${shortName(tab.name)}" before closing?`,
    message: "If you don't save, the changes stay in Reopen Closed Tab until ReqLab quits.",
    confirmLabel: "Save changes",
    secondaryLabel: "Don't save",
    isDanger: false,
  });
  if (choice === "cancel") return false;
  return choice === "secondary" || (await saveBeforeClosing(tab.id));
}

/** Takes the tab out (remembering it for Reopen Closed Tab) and activates its neighbour. */
function removeTab(tab: RequestTab): void {
  const tabId = tab.id;
  const index = tabs.get().findIndex((other) => other.id === tabId);
  if (index === -1) return;
  closedTabs.push({ tab: { ...tab, sendingRequestId: undefined }, index });
  // Reopen Closed Tab brings the undo history back; a tab that falls off the list loses it.
  if (closedTabs.length > MAX_CLOSED_TABS) forgetDraftHistory(closedTabs.shift()?.tab.id ?? "");
  const remaining = tabs.get().filter((other) => other.id !== tabId);
  tabs.set(remaining);
  if (activeTabId.get() === tabId) activeTabId.set(remaining[Math.min(index, remaining.length - 1)]?.id);
}

export function closeActiveTab(): void {
  const active = activeTabId.get();
  if (active !== undefined) void closeTab(active);
}

/** Brings back the last closed tab where it was, as it was (edits and response included). */
export function reopenClosedTab(): void {
  const closed = closedTabs.pop();
  if (closed === undefined) return;
  const alreadyOpen = tabs.get().find((tab) => tab.itemId !== null && tab.itemId === closed.tab.itemId);
  if (alreadyOpen !== undefined) {
    activeTabId.set(alreadyOpen.id);
    return;
  }
  const isItemGone = closed.tab.itemId !== null && findTreeItem(closed.tab.itemId) === undefined;
  const tab = isItemGone ? { ...closed.tab, itemId: null, savedJson: "" } : closed.tab;
  const list = [...tabs.get()];
  list.splice(Math.min(closed.index, list.length), 0, tab);
  tabs.set(list);
  activeTabId.set(tab.id);
}

/** Saved changes, or a draft someone typed into, deserve a question; an empty new tab does not. */
export function needsCloseConfirmation(tab: RequestTab): boolean {
  if (!hasUnsavedChanges(tab)) return false;
  const isUntouchedDraft =
    tab.itemId === null &&
    tab.response === undefined &&
    JSON.stringify(tab.draft) === JSON.stringify(createEmptyRequest());
  return !isUntouchedDraft;
}

/** Saves a tab that belongs to a collection. Drafts need a place first (see saveDraftAs). */
export async function saveTab(workspaceId: string, tabId: string): Promise<void> {
  const tab = findTab(tabId);
  if (tab === undefined || tab.itemId === null) return;
  const saved = await callApi(api.saveRequest({ workspaceId, itemId: tab.itemId, definition: tab.draft }));
  if (saved !== undefined) updateTab(tabId, { savedJson: JSON.stringify(tab.draft) });
}

/** Creates a request item from a draft tab, saves it, and links the tab to it. */
export async function saveDraftAs(
  workspaceId: string,
  tabId: string,
  place: { collectionId: string; parentId: string | null; name: string },
): Promise<void> {
  const tab = findTab(tabId);
  if (tab === undefined) return;
  const item = await callApi(api.createItem({ workspaceId, kind: "request", ...place }));
  if (item === undefined) return;
  updateTab(tabId, { itemId: item.id, name: item.name });
  await saveTab(workspaceId, tabId);
  showNotice(`Saved "${item.name}".`, false);
}

/**
 * After the tree changes: keep tab names in step; tabs of deleted requests become drafts, and
 * settings tabs of deleted collections or folders close.
 */
export function reconcileTabsWithTree(): void {
  const items = new Map(collectionTree.get().items.map((item) => [item.id, item]));
  const names = containerNames();
  tabs.set(
    tabs.get().flatMap((tab) => {
      if (tab.container !== undefined) {
        const name = names.get(tab.container.id);
        return name === undefined ? [] : [name === tab.name ? tab : { ...tab, name }];
      }
      if (tab.itemId === null) return tab;
      const item = items.get(tab.itemId);
      if (item === undefined) return { ...tab, itemId: null, savedJson: "" };
      return item.name === tab.name ? tab : { ...tab, name: item.name };
    }),
  );
}

/** Set while tabs are being restored, so a half-built list is never saved over the stored one. */
let isRestoring = false;

/** Reopens the tabs exactly as they were left: drafts, unsaved edits, sub-tabs and small responses. */
export async function restoreTabs(workspaceId: string): Promise<void> {
  isRestoring = true;
  try {
    tabs.set([]);
    activeTabId.set(undefined);
    const saved = await callApi(api.getOpenTabs({ workspaceId }));
    if (saved === undefined) return;
    activeEnvironmentId.set(saved.environmentId);
    const restored = await Promise.all(saved.tabs.map((tab) => restoreTab(workspaceId, tab)));
    tabs.set(restored);
    activeTabId.set(restored[saved.activeIndex ?? 0]?.id ?? restored.at(0)?.id);
  } finally {
    isRestoring = false;
  }
}

/** A tab whose request was deleted meanwhile comes back as a draft, keeping its contents. */
async function restoreTab(workspaceId: string, persisted: PersistedTab): Promise<RequestTab> {
  if (persisted.itemId === null || findTreeItem(persisted.itemId) === undefined) {
    return fromPersistedTab(persisted, "");
  }
  const stored = await api.getRequest({ workspaceId, itemId: persisted.itemId });
  return fromPersistedTab(persisted, stored.ok ? JSON.stringify(stored.value) : "");
}

/** Settings tabs are not kept: only requests come back after a restart. */
export async function persistTabs(workspaceId: string): Promise<void> {
  if (isRestoring) return;
  const open = tabs
    .get()
    .filter((tab) => tab.container === undefined)
    .slice(0, MAX_OPEN_TABS);
  const activeIndex = open.findIndex((tab) => tab.id === activeTabId.get());
  await api.saveOpenTabs({
    workspaceId,
    openTabs: {
      tabs: open.map(toPersistedTab),
      activeIndex: activeIndex === -1 ? null : activeIndex,
      environmentId: activeEnvironmentId.get(),
    },
  });
}

function containerNames(): Map<string, string> {
  const { collections, items } = collectionTree.get();
  const folders = items.filter((item) => item.kind === "folder");
  return new Map([...collections, ...folders].map((entry) => [entry.id, entry.name]));
}

/** Opens a collection's or folder's settings in a tab, or shows the one already open. */
export function openContainerTab(
  target: { id: string; name: string; isCollection: boolean },
  section: ContainerSection = "auth",
): void {
  const open = tabs.get().find((tab) => tab.container?.id === target.id);
  if (open?.container !== undefined) {
    updateTab(open.id, { container: { ...open.container, section } });
    activeTabId.set(open.id);
    return;
  }
  const tab = createTab({ itemId: null, name: target.name, definition: createEmptyRequest() });
  addTab({ ...tab, container: { id: target.id, isCollection: target.isCollection, section } });
}

function addTab(tab: RequestTab): void {
  if (tabs.get().length >= MAX_OPEN_TABS) {
    showNotice(`Close a tab first: at most ${String(MAX_OPEN_TABS)} can be open.`);
    return;
  }
  tabs.set([...tabs.get(), tab]);
  activeTabId.set(tab.id);
}
