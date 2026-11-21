import type { Collection, CollectionTree, ItemKind, TreeItem } from "@shared/models/collection";
import { api } from "../api";
import { callApi } from "./notice-store";
import { readCollapsed, saveCollapsed } from "./collapsed-store";
import { signal } from "./signal";

export const collectionTree = signal<CollectionTree>({ collections: [], items: [] });
/** Folders and collections the user collapsed (remembered per workspace). New ones start expanded. */
export const collapsedIds = signal<ReadonlySet<string>>(new Set());
let collapsedOwner: string | undefined;

export async function loadCollectionTree(workspaceId: string): Promise<void> {
  const tree = await callApi(api.getCollectionTree({ workspaceId }));
  if (tree === undefined) return;
  if (collapsedOwner !== workspaceId) {
    collapsedOwner = workspaceId;
    collapsedIds.set(readCollapsed(workspaceId));
  }
  collectionTree.set(tree);
}

export async function createCollection(workspaceId: string, name: string): Promise<Collection | undefined> {
  const created = await callApi(api.createCollection({ workspaceId, name }));
  if (created !== undefined) await loadCollectionTree(workspaceId);
  return created;
}

export async function createItem(
  workspaceId: string,
  place: { collectionId: string; parentId: string | null; kind: ItemKind; name: string },
): Promise<TreeItem | undefined> {
  const created = await callApi(api.createItem({ workspaceId, ...place }));
  if (created !== undefined) await loadCollectionTree(workspaceId);
  return created;
}

export async function renameTreeEntry(workspaceId: string, id: string, name: string): Promise<void> {
  if ((await callApi(api.renameEntity({ workspaceId, id, name }))) !== undefined) {
    await loadCollectionTree(workspaceId);
  }
}

export async function deleteTreeEntry(workspaceId: string, id: string): Promise<void> {
  if ((await callApi(api.deleteEntity({ workspaceId, id }))) !== undefined) {
    await loadCollectionTree(workspaceId);
  }
}

export async function moveItem(
  workspaceId: string,
  move: { itemId: string; collectionId: string; parentId: string | null; beforeItemId?: string | null },
): Promise<void> {
  if ((await callApi(api.moveItem({ workspaceId, ...move }))) !== undefined) {
    await loadCollectionTree(workspaceId);
  }
}

export async function moveCollection(
  workspaceId: string,
  id: string,
  beforeId: string | null,
): Promise<void> {
  if ((await callApi(api.moveCollection({ workspaceId, id, beforeId }))) !== undefined) {
    await loadCollectionTree(workspaceId);
  }
}

/** Copies a collection, folder or request (with everything inside); returns the copy's id. */
export async function duplicateEntry(workspaceId: string, id: string): Promise<string | undefined> {
  const copy = await callApi(api.duplicateEntry({ workspaceId, id }));
  if (copy !== undefined) await loadCollectionTree(workspaceId);
  return copy?.id;
}

export function toggleCollapsed(id: string): void {
  const next = new Set(collapsedIds.get());
  if (!next.delete(id)) next.add(id);
  collapsedIds.set(next);
  if (collapsedOwner !== undefined) saveCollapsed(collapsedOwner, next);
}

/** Opens the folders and the collection around an item, so its row shows in the tree. */
export function expandParentsOf(itemId: string): void {
  const item = findTreeItem(itemId);
  if (item === undefined) return;
  const next = new Set(collapsedIds.get());
  let parentId = item.parentId;
  while (parentId !== null) {
    next.delete(parentId);
    parentId = findTreeItem(parentId)?.parentId ?? null;
  }
  next.delete(item.collectionId);
  if (next.size === collapsedIds.get().size) return;
  collapsedIds.set(next);
  if (collapsedOwner !== undefined) saveCollapsed(collapsedOwner, next);
}

export function findTreeItem(itemId: string | null): TreeItem | undefined {
  return collectionTree.get().items.find((item) => item.id === itemId);
}

export function childrenOf(collectionId: string, parentId: string | null): TreeItem[] {
  return collectionTree
    .get()
    .items.filter((item) => item.collectionId === collectionId && item.parentId === parentId);
}
