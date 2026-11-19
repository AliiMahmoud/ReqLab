import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { TreeItem } from "@shared/models/collection";
import {
  childrenOf,
  collectionTree,
  findTreeItem,
  moveCollection,
  moveItem,
} from "../../stores/collection-store";
import { DRAG_TYPE, draggedItemId, noteDragStart } from "./tree-rows";
import { isMovingWithSelection, itemsToMove } from "./tree-selection";

type DropPosition = "before" | "after" | "inside";

/** Collections are dragged with their own type: they only go before / after other collections. */
const COLLECTION_DRAG_TYPE = "application/x-reqlab-collection";

/** dragstart for a collection row. */
export function dragCollection(collectionId: string): (event: DragEvent) => void {
  return (event) => {
    event.stopPropagation();
    noteDragStart(collectionId);
    event.dataTransfer?.setData(COLLECTION_DRAG_TYPE, collectionId);
    if (event.dataTransfer !== null) event.dataTransfer.effectAllowed = "move";
  };
}

/** A row that can receive a drop: a collection, a folder, or a request. */
export interface DropRow {
  id: string;
  collectionId: string;
  /** The folder itself, or null for a collection's top level. Undefined for a request. */
  folderId: string | null | undefined;
}

export interface DropHandlers {
  dragover: (event: DragEvent) => void;
  dragleave: () => void;
  drop: (event: DragEvent) => Promise<void>;
}

/**
 * Drag and drop in the tree. Over a folder: top quarter = before it, bottom quarter = after it,
 * middle = inside. Over a request: top half = before, bottom half = after. Over a collection: inside.
 */
export class TreeDropController implements ReactiveController {
  #hint: { id: string; position: DropPosition } | undefined;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly workspaceId: () => string,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    // Nothing to set up: the hint only exists while dragging.
  }

  /** "is-drop-target" (inside), "is-drop-before" or "is-drop-after" for the row under the pointer. */
  classFor(id: string): string {
    if (this.#hint?.id !== id) return "";
    return this.#hint.position === "inside" ? "is-drop-target" : `is-drop-${this.#hint.position}`;
  }

  handlersFor(row: DropRow): DropHandlers {
    return {
      dragover: (event) => {
        const position = acceptedPosition(event, row);
        if (position === undefined) return;
        event.preventDefault();
        this.show({ id: row.id, position });
      },
      dragleave: () => {
        this.show(undefined);
      },
      drop: (event) => this.drop(event, row),
    };
  }

  private async drop(event: DragEvent, row: DropRow): Promise<void> {
    event.preventDefault();
    this.show(undefined);
    const collectionId = event.dataTransfer?.getData(COLLECTION_DRAG_TYPE) ?? "";
    if (collectionId !== "") await this.dropCollection(collectionId, row, halfAt(event));
    else await this.dropItem(event.dataTransfer?.getData(DRAG_TYPE) ?? "", row, positionAt(event, row));
  }

  private async dropCollection(collectionId: string, row: DropRow, side: "before" | "after"): Promise<void> {
    // Collections only go next to other collections (never into a folder).
    if (collectionId === row.id || row.folderId !== null) return;
    await moveCollection(this.workspaceId(), collectionId, collectionBeforeId(row.id, side));
  }

  /** Moves the dragged item, or every selected one with it, keeping their order. */
  private async dropItem(itemId: string, row: DropRow, position: DropPosition): Promise<void> {
    if (itemId === "" || itemId === row.id) return;
    const target = position === "inside" ? insideTarget(row) : besideTarget(row.id, position);
    if (target === undefined) return;
    for (const id of itemsToMove(itemId).filter((candidate) => candidate !== row.id)) {
      await moveItem(this.workspaceId(), { itemId: id, ...target });
    }
  }

  private show(hint: { id: string; position: DropPosition } | undefined): void {
    if (hint?.id === this.#hint?.id && hint?.position === this.#hint?.position) return;
    this.#hint = hint;
    this.host.requestUpdate();
  }
}

/** Where a drop would go, or undefined when this row does not take what is being dragged. */
function acceptedPosition(event: DragEvent, row: DropRow): DropPosition | undefined {
  if (row.id === draggedItemId() || isMovingWithSelection(row.id, draggedItemId())) return undefined;
  const types = event.dataTransfer?.types ?? [];
  if (types.includes(COLLECTION_DRAG_TYPE)) return row.folderId === null ? halfAt(event) : undefined;
  return types.includes(DRAG_TYPE) ? positionAt(event, row) : undefined;
}

function halfAt(event: DragEvent): "before" | "after" {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

/** "after" a collection means before the collection that follows it (or last). */
function collectionBeforeId(collectionId: string, side: "before" | "after"): string | null {
  if (side === "before") return collectionId;
  const all = collectionTree.get().collections;
  return all[all.findIndex((collection) => collection.id === collectionId) + 1]?.id ?? null;
}

function positionAt(event: DragEvent, row: DropRow): DropPosition {
  if (row.folderId === null) return "inside"; // a collection
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const share = (event.clientY - rect.top) / Math.max(rect.height, 1);
  if (row.folderId === undefined) return share < 0.5 ? "before" : "after"; // a request
  if (share < 0.25) return "before";
  return share > 0.75 ? "after" : "inside";
}

function insideTarget(row: DropRow): { collectionId: string; parentId: string | null } {
  return { collectionId: row.collectionId, parentId: row.folderId ?? null };
}

/** Same parent as the row, just before it (or before the sibling after it). */
function besideTarget(
  rowId: string,
  position: "before" | "after",
): { collectionId: string; parentId: string | null; beforeItemId: string | null } | undefined {
  const item: TreeItem | undefined = findTreeItem(rowId);
  if (item === undefined) return undefined;
  const siblings = childrenOf(item.collectionId, item.parentId);
  const next = siblings[siblings.findIndex((sibling) => sibling.id === item.id) + 1];
  const beforeItemId = position === "before" ? item.id : (next?.id ?? null);
  return { collectionId: item.collectionId, parentId: item.parentId, beforeItemId };
}
