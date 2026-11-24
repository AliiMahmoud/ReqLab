import { takeRedo, takeUndo } from "../../stores/draft-history";
import { getActiveTab, updateTab } from "../../stores/tab-store";
import { mainView } from "../../stores/view-store";

let isInstalled = false;

/**
 * Cmd/Ctrl+Z undoes, and Shift+Cmd/Ctrl+Z or Ctrl+Y redoes, the open request's edits from its own
 * history (draft-history.ts), so it still works after visiting another tab, a folder's settings,
 * the Environments page or another body type. It applies in the request's fields and tables, and
 * with nothing focused. A code editor undoes its own typing (it handles the key first); dialogs,
 * Environments and the sidebar keep their fields' own undo.
 */
export function installRequestUndoKeys(): void {
  if (isInstalled) return;
  isInstalled = true;
  window.addEventListener("keydown", (event) => {
    const action = undoAction(event);
    if (action === undefined || event.defaultPrevented || !isInOpenRequest(event)) return;
    const tab = getActiveTab();
    if (tab === undefined || tab.container !== undefined) return;
    // The field's own undo would bring back text the request no longer has: this one replaces it.
    event.preventDefault();
    const fields = action === "undo" ? takeUndo(tab.id) : takeRedo(tab.id);
    if (fields !== undefined) updateTab(tab.id, { draft: { ...tab.draft, ...fields } });
  });
}

function undoAction(event: KeyboardEvent): "undo" | "redo" | undefined {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return undefined;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  return key === "y" && event.ctrlKey ? "redo" : undefined;
}

/** In the request's fields or tables, or nothing focused; not in a dialog or a code editor. */
function isInOpenRequest(event: KeyboardEvent): boolean {
  if (mainView.get() !== "requests") return false;
  const path = event.composedPath();
  const isIn = (match: (element: Element) => boolean): boolean =>
    path.some((target) => target instanceof Element && match(target));
  if (isIn((element) => element instanceof HTMLDialogElement || element.classList.contains("cm-editor"))) {
    return false;
  }
  const isNothingFocused = path[0] === document.body || path[0] === document.documentElement;
  return isNothingFocused || isIn((element) => element.tagName === "REQUEST-AREA");
}
