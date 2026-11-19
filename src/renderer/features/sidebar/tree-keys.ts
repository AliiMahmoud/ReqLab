import { clearSelection, deleteSelection, selectOnClick, treeSelection } from "./tree-selection";

/**
 * Mouse and keyboard for the collection tree. macOS does not focus a button on click, so a clicked
 * row is focused here. Cmd/Ctrl- and Shift-clicks change the selection (they don't open anything);
 * Delete or Backspace deletes the selection; Escape clears it.
 */
export function installTreeKeys(host: HTMLElement, workspaceId: () => string): void {
  // Capture phase: runs before the row's own click (open a request / fold a folder), so a
  // selection click can stop it.
  host.addEventListener(
    "click",
    (event) => {
      const button = rowButtonIn(event);
      const id = button?.dataset["entryId"];
      if (button === undefined || id === undefined) return;
      // preventScroll: a half-hidden row must not jump to the middle (expanding shows its contents below).
      button.focus({ preventScroll: true });
      if (selectOnClick(event, id, () => visibleIds(host))) event.stopPropagation();
    },
    true,
  );
  host.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      clearSelection();
      return;
    }
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    if (rowButtonIn(event) === undefined || treeSelection.get().size === 0) return;
    event.preventDefault();
    void deleteSelection(workspaceId());
  });
}

/** Rows in the order they appear (for Shift ranges). */
function visibleIds(host: HTMLElement): string[] {
  const buttons =
    host.shadowRoot?.querySelectorAll<HTMLButtonElement>("button.row-main[data-entry-id]") ?? [];
  return [...buttons].map((button) => button.dataset["entryId"] ?? "");
}

/** The tree row's main button the event happened on (inside the tree's shadow root), if any. */
function rowButtonIn(event: Event): HTMLButtonElement | undefined {
  return event
    .composedPath()
    .find(
      (node): node is HTMLButtonElement =>
        node instanceof HTMLButtonElement && node.classList.contains("row-main"),
    );
}

/** In the rename box: Enter commits (by leaving the box), Escape cancels. Delete / Backspace edit text. */
export function renameKeys(cancel: () => void): (event: KeyboardEvent) => void {
  return (event) => {
    event.stopPropagation(); // keys typed into the name never reach the tree's Delete handling
    if (event.key === "Enter") (event.target as HTMLInputElement).blur();
    if (event.key === "Escape") cancel();
  };
}
