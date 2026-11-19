import type { MenuItem } from "../../components/context-menu";
import { exportIcon, trashIcon } from "../../components/icons";
import { exportSelection } from "../../stores/collection-transfer";
import { collectionTree, deleteTreeEntry, findTreeItem } from "../../stores/collection-store";
import { askToConfirm } from "../../stores/confirm-store";
import { signal } from "../../stores/signal";
import { reconcileTabsWithTree } from "../../stores/tab-store";

const IS_MAC = navigator.userAgent.includes("Mac");

/** The rows selected in the tree (collections, folders and requests), and where a Shift range starts. */
export const treeSelection = signal<ReadonlySet<string>>(new Set());
let anchorId: string | undefined;

/**
 * Click with Cmd (macOS) / Ctrl to add or remove a row, Shift to select a range, a plain click to
 * select just that row. Returns true when the click only changed the selection (no open / toggle).
 */
export function selectOnClick(event: MouseEvent, id: string, visibleIds: () => string[]): boolean {
  if (event.shiftKey && anchorId !== undefined) {
    selectRange(anchorId, id, visibleIds());
    return true;
  }
  anchorId = id;
  if (!(IS_MAC ? event.metaKey : event.ctrlKey)) {
    treeSelection.set(new Set([id]));
    return false;
  }
  const next = new Set(treeSelection.get());
  if (!next.delete(id)) next.add(id);
  treeSelection.set(next);
  return true;
}

/** Everything shown between two rows, both included. */
function selectRange(fromId: string, toId: string, order: string[]): void {
  const ends = [order.indexOf(fromId), order.indexOf(toId)];
  if (ends.includes(-1)) return;
  const [start = 0, end = 0] = ends.sort((a, b) => a - b);
  treeSelection.set(new Set(order.slice(start, end + 1)));
}

/** "is-selected" when a row is part of a multi-selection (one selected row looks like a normal click). */
export function selectedClass(id: string): string {
  const selected = treeSelection.get();
  return selected.size > 1 && selected.has(id) ? "is-selected" : "";
}

/** Right-click inside a multi-selection: act on all of it. Undefined for a single row (its own menu). */
export function selectionMenuItems(id: string, workspaceId: string): MenuItem[] | undefined {
  const selected = treeSelection.get();
  if (selected.size < 2 || !selected.has(id)) return undefined;
  return [
    {
      label: `Export ${String(selected.size)} items…`,
      icon: exportIcon(),
      run: () => void exportSelection(workspaceId, topmostSelected()),
    },
    {
      label: `Delete ${String(selected.size)} items`,
      startsGroup: true,
      icon: trashIcon(15),
      isDanger: true,
      run: () => void deleteSelection(workspaceId),
    },
  ];
}

export function clearSelection(): void {
  treeSelection.set(new Set());
}

/** Deletes the selection with one question; items inside a selected folder go with it. */
export async function deleteSelection(workspaceId: string): Promise<void> {
  const ids = topmostSelected();
  if (ids.length === 0) return;
  const confirmed = await askToConfirm({
    kind: "delete-tree-item",
    title: ids.length === 1 ? `Delete "${nameOf(ids[0] ?? "")}"?` : `Delete ${String(ids.length)} items?`,
    message: "Everything inside them is deleted too. This cannot be undone.",
    confirmLabel: "Delete",
    isDanger: true,
  });
  if (!confirmed) return;
  for (const id of ids) await deleteTreeEntry(workspaceId, id);
  clearSelection();
  reconcileTabsWithTree();
}

/**
 * What a drag of `draggedId` moves: the whole selection's requests and folders (in tree order,
 * without items inside a selected folder) when it is part of a multi-selection, else just itself.
 */
export function itemsToMove(draggedId: string): string[] {
  const selected = treeSelection.get();
  if (selected.size < 2 || !selected.has(draggedId)) return [draggedId];
  const order = collectionTree.get().items.map((item) => item.id);
  return topmostSelected()
    .filter((id) => findTreeItem(id) !== undefined)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** True while dragging a multi-selection that includes this row (no drop marker on it). */
export function isMovingWithSelection(rowId: string, draggedId: string | undefined): boolean {
  const selected = treeSelection.get();
  return draggedId !== undefined && selected.size > 1 && selected.has(draggedId) && selected.has(rowId);
}

/** The selected ids whose collection / parent folders are not selected too. */
function topmostSelected(): string[] {
  const selected = treeSelection.get();
  return [...selected].filter((id) => !hasSelectedAncestor(id, selected));
}

function hasSelectedAncestor(id: string, selected: ReadonlySet<string>): boolean {
  const item = findTreeItem(id);
  if (item === undefined) return false;
  if (selected.has(item.collectionId)) return true;
  for (
    let parent = findTreeItem(item.parentId);
    parent !== undefined;
    parent = findTreeItem(parent.parentId)
  ) {
    if (selected.has(parent.id)) return true;
  }
  return false;
}

function nameOf(id: string): string {
  const collection = collectionTree.get().collections.find((candidate) => candidate.id === id);
  return collection?.name ?? findTreeItem(id)?.name ?? "";
}
