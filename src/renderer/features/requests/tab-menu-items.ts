import type { MenuItem } from "../../components/context-menu";
import { closeTabsAround, tabsToClose, type CloseScope } from "../../stores/tab-close-actions";
import { closeTab, reopenClosedTab } from "../../stores/tab-store";

/** A request tab's right-click menu: close it, the others, those to the left / right, or all. */
export function tabMenuItems(tabId: string): MenuItem[] {
  const bulk = (label: string, scope: CloseScope): MenuItem => ({
    label,
    run: () => void closeTabsAround(tabId, scope),
    isEnabled: tabsToClose(tabId, scope).length > 0,
  });
  return [
    { label: "Close tab", run: () => void closeTab(tabId), shortcut: "Mod+W" },
    bulk("Close other tabs", "others"),
    bulk("Close tabs to the left", "left"),
    bulk("Close tabs to the right", "right"),
    bulk("Close all tabs", "all"),
    { label: "Reopen closed tab", run: reopenClosedTab, shortcut: "Mod+Shift+T", startsGroup: true },
  ];
}
