import { childrenOf, collectionTree, findTreeItem } from "../../stores/collection-store";

/** Where a request is saved: nowhere yet (the list of collections), a collection, or a folder in it. */
export interface SaveLocation {
  collectionId: string | null;
  folderId: string | null;
}

export const ALL_COLLECTIONS: SaveLocation = { collectionId: null, folderId: null };

export interface Crumb {
  label: string;
  location: SaveLocation;
}

/** One row of the browser: collections and folders open; requests are shown for context only. */
export interface Entry {
  kind: "collection" | "folder" | "request";
  id: string;
  name: string;
  method: string | null;
  location: SaveLocation | undefined;
  /** "Shop / Orders" for search results, so same-named folders can be told apart. */
  path: string | undefined;
}

export function collectionName(collectionId: string): string {
  return collectionTree.get().collections.find((collection) => collection.id === collectionId)?.name ?? "";
}

/** "All collections › Shop › Orders › Drafts", each step clickable. */
export function breadcrumbOf(location: SaveLocation): Crumb[] {
  const crumbs: Crumb[] = [{ label: "All collections", location: ALL_COLLECTIONS }];
  if (location.collectionId === null) return crumbs;
  const collectionId = location.collectionId;
  crumbs.push({ label: collectionName(collectionId), location: { collectionId, folderId: null } });
  return [
    ...crumbs,
    ...folderChain(location.folderId).map((folder) => ({
      label: folder.name,
      location: { collectionId, folderId: folder.id },
    })),
  ];
}

/** The folders from the collection down to this one. */
function folderChain(folderId: string | null): { id: string; name: string }[] {
  const chain: { id: string; name: string }[] = [];
  let folder = findTreeItem(folderId);
  while (folder !== undefined && chain.length < 64) {
    chain.unshift({ id: folder.id, name: folder.name });
    folder = findTreeItem(folder.parentId);
  }
  return chain;
}

/** What is inside a location: collections at the top level; folders first, then requests, inside. */
export function entriesAt(location: SaveLocation): Entry[] {
  if (location.collectionId === null) {
    return collectionTree.get().collections.map((collection) => ({
      kind: "collection",
      id: collection.id,
      name: collection.name,
      method: null,
      location: { collectionId: collection.id, folderId: null },
      path: undefined,
    }));
  }
  const collectionId = location.collectionId;
  const children = childrenOf(collectionId, location.folderId);
  const toEntry = (item: (typeof children)[number]): Entry => ({
    kind: item.kind,
    id: item.id,
    name: item.name,
    method: item.method,
    location: item.kind === "folder" ? { collectionId, folderId: item.id } : undefined,
    path: undefined,
  });
  return [
    ...children.filter((item) => item.kind === "folder"),
    ...children.filter((item) => item.kind !== "folder"),
  ].map(toEntry);
}

/** Collections and folders anywhere whose name contains the query. */
export function searchEntries(query: string): Entry[] {
  const needle = query.trim().toLowerCase();
  const matches = (name: string): boolean => name.toLowerCase().includes(needle);
  const collections = entriesAt(ALL_COLLECTIONS).filter((entry) => matches(entry.name));
  const folders = collectionTree
    .get()
    .items.filter((item) => item.kind === "folder" && matches(item.name))
    .map((item): Entry => ({
      kind: "folder",
      id: item.id,
      name: item.name,
      method: null,
      location: { collectionId: item.collectionId, folderId: item.id },
      path: [
        collectionName(item.collectionId),
        ...folderChain(item.parentId).map((folder) => folder.name),
      ].join(" / "),
    }));
  return [...collections, ...folders];
}

/** The name shown on the Save button, or undefined at the top level (nothing chosen yet). */
export function locationName(location: SaveLocation): string | undefined {
  if (location.collectionId === null) return undefined;
  return location.folderId === null
    ? collectionName(location.collectionId)
    : findTreeItem(location.folderId)?.name;
}

/** A location remembered from the last save may have been deleted since. */
export function stillExists(location: SaveLocation): boolean {
  if (location.collectionId === null) return true;
  if (collectionName(location.collectionId) === "") return false;
  return location.folderId === null || findTreeItem(location.folderId) !== undefined;
}
