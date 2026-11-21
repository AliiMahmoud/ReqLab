import type { LitElement, ReactiveController } from "lit";
import { expandParentsOf } from "../../stores/collection-store";
import { getActiveTab } from "../../stores/tab-store";

/**
 * Shows the open request in the tree: when another request becomes the active tab (from the tree,
 * a tab, history or search), its folders and collection open and its row scrolls into view.
 * Once per switch, so the user can still collapse them afterwards.
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

  private scrollToActiveRow(): void {
    const row = this.host.renderRoot.querySelector(".row.is-active");
    if (row === null) return;
    this.#isScrollPending = false;
    // In the middle of the tree, with the requests around it in view.
    row.scrollIntoView({ block: "center" });
  }
}
