import type { LitElement, ReactiveController } from "lit";
import { expandParentsOf } from "../../stores/collection-store";
import { getActiveTab } from "../../stores/tab-store";

/**
 * Shows the open request in the tree: when another request becomes the active tab (from the tree,
 * a tab, history or search), its folders and collection open if closed, and its row scrolls into
 * view only if it is not already visible. Once per switch, so the user can collapse them afterwards.
 */
export class TreeRevealController implements ReactiveController {
  #revealedTabId: string | undefined;
  #isScrollPending = false;

  constructor(private readonly host: LitElement) {
    host.addController(this);
  }

  hostUpdated(): void {
    const tab = getActiveTab();
    if (tab !== undefined && tab.id !== this.#revealedTabId) {
      this.#revealedTabId = tab.id;
      this.#isScrollPending = tab.itemId !== null;
      // Opening a collapsed folder re-renders the tree; the scroll then happens on that update.
      if (tab.itemId !== null) expandParentsOf(tab.itemId);
    }
    if (this.#isScrollPending) this.scrollToActiveRow();
  }

  /** Only when the row is not already in view; then into the middle, with its neighbours around it. */
  private scrollToActiveRow(): void {
    const row = this.host.renderRoot.querySelector(".row.is-active");
    if (row === null) return;
    this.#isScrollPending = false;
    if (isFullyInView(row, this.host)) return;
    row.scrollIntoView({ block: "center" });
  }
}

/** The row sits wholly inside the tree's visible area (the tree scrolls itself). */
function isFullyInView(row: Element, tree: Element): boolean {
  const rowBox = row.getBoundingClientRect();
  const treeBox = tree.getBoundingClientRect();
  return rowBox.top >= treeBox.top && rowBox.bottom <= treeBox.bottom;
}
