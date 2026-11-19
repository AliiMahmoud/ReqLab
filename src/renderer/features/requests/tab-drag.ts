import type { ReactiveController, ReactiveControllerHost } from "lit";
import { moveTab } from "../../stores/tab-order";
import { tabs } from "../../stores/tab-store";

/** Its own type, so a tab can't be dropped on the collection tree (and tree items not on tabs). */
const TAB_DRAG_TYPE = "application/x-reqlab-tab";

export interface TabDragHandlers {
  dragstart: (event: DragEvent) => void;
  dragover: (event: DragEvent) => void;
  dragleave: (event: DragEvent) => void;
  drop: (event: DragEvent) => void;
  dragend: () => void;
}

/** Drag a tab left or right to reorder; the left or right half of the tab under the pointer decides. */
export class TabDragController implements ReactiveController {
  #hint: { tabId: string; side: "before" | "after" } | undefined;
  #draggingId: string | undefined;

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected(): void {
    // The hint only exists while dragging.
  }

  /** "is-dragging" on the tab being moved; "is-drop-before/after" on the tab it would land next to. */
  classFor(tabId: string): string {
    const dragging = this.#draggingId === tabId ? "is-dragging" : "";
    const drop = this.#hint?.tabId === tabId ? `is-drop-${this.#hint.side}` : "";
    return `${dragging} ${drop}`;
  }

  /** The pointer left the tab bar (or went into a gap between tabs): no drop marker. */
  clearHint(): void {
    this.show(undefined);
  }

  handlersFor(tabId: string): TabDragHandlers {
    return {
      dragstart: (event) => {
        event.dataTransfer?.setData(TAB_DRAG_TYPE, tabId);
        if (event.dataTransfer !== null) event.dataTransfer.effectAllowed = "move";
        this.#draggingId = tabId;
        this.host.requestUpdate();
      },
      dragover: (event) => {
        this.markDropPlace(event, tabId);
      },
      // Moving onto the tab's own buttons fires dragleave too: only a real exit clears the marker.
      dragleave: (event) => {
        const tab = event.currentTarget as HTMLElement;
        if (!(event.relatedTarget instanceof Node && tab.contains(event.relatedTarget))) this.show(undefined);
      },
      drop: (event) => {
        event.preventDefault();
        const draggedId = event.dataTransfer?.getData(TAB_DRAG_TYPE) ?? "";
        this.show(undefined);
        if (draggedId !== "") moveTab(draggedId, beforeIdFor(tabId, sideOf(event)));
      },
      dragend: () => {
        this.#draggingId = undefined;
        this.#hint = undefined;
        this.host.requestUpdate();
      },
    };
  }

  /** No marker where a drop would leave the order as it is (beside the tab's own place). */
  private markDropPlace(event: DragEvent, tabId: string): void {
    if (event.dataTransfer?.types.includes(TAB_DRAG_TYPE) !== true) return;
    event.preventDefault();
    const side = sideOf(event);
    this.show(this.wouldMove(tabId, side) ? { tabId, side } : undefined);
  }

  private wouldMove(tabId: string, side: "before" | "after"): boolean {
    const draggedId = this.#draggingId;
    if (draggedId === undefined || draggedId === tabId) return false;
    const all = tabs.get();
    const nextId = all[all.findIndex((tab) => tab.id === draggedId) + 1]?.id ?? null;
    const beforeId = beforeIdFor(tabId, side);
    return beforeId !== draggedId && beforeId !== nextId;
  }

  private show(hint: { tabId: string; side: "before" | "after" } | undefined): void {
    if (hint?.tabId === this.#hint?.tabId && hint?.side === this.#hint?.side) return;
    this.#hint = hint;
    this.host.requestUpdate();
  }
}

function sideOf(event: DragEvent): "before" | "after" {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  return event.clientX < rect.left + rect.width / 2 ? "before" : "after";
}

/** "after" a tab means before the tab that follows it (or last). */
function beforeIdFor(tabId: string, side: "before" | "after"): string | null {
  if (side === "before") return tabId;
  const all = tabs.get();
  return all[all.findIndex((tab) => tab.id === tabId) + 1]?.id ?? null;
}
