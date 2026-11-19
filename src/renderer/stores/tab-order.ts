import { tabs } from "./tab-store";

/** Moves a tab so it sits just before `beforeTabId`, or last when that is null. */
export function moveTab(tabId: string, beforeTabId: string | null): void {
  if (tabId === beforeTabId) return;
  const all = tabs.get();
  const moving = all.find((tab) => tab.id === tabId);
  if (moving === undefined) return;
  const rest = all.filter((tab) => tab.id !== tabId);
  const index = beforeTabId === null ? rest.length : rest.findIndex((tab) => tab.id === beforeTabId);
  if (index === -1) return;
  tabs.set([...rest.slice(0, index), moving, ...rest.slice(index)]);
}
