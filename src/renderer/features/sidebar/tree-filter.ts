import type { CollectionTree, TreeItem } from "@shared/models/collection";

/**
 * Which collections and items to show for a search: every match plus its ancestors.
 * An empty query shows everything (undefined).
 */
export function findVisibleIds(tree: CollectionTree, query: string): ReadonlySet<string> | undefined {
  const needle = query.trim().toLowerCase();
  if (needle === "") return undefined;
  const itemsById = new Map(tree.items.map((item) => [item.id, item]));
  const visible = new Set<string>();
  for (const item of tree.items) {
    if (item.name.toLowerCase().includes(needle)) addWithAncestors(item, itemsById, visible);
  }
  for (const collection of tree.collections) {
    if (collection.name.toLowerCase().includes(needle)) visible.add(collection.id);
  }
  return visible;
}

function addWithAncestors(item: TreeItem, itemsById: Map<string, TreeItem>, visible: Set<string>): void {
  visible.add(item.collectionId);
  let current: TreeItem | undefined = item;
  while (current !== undefined && !visible.has(current.id)) {
    visible.add(current.id);
    current = current.parentId === null ? undefined : itemsById.get(current.parentId);
  }
}
