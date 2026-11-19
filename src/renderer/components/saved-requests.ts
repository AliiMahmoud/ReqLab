import { collectionTree } from "../stores/collection-store";

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  /** "Collection / Folder / … / Request". */
  path: string;
}

/** Every saved request of the open workspace (for the runRequest picker and ID labels). */
export function savedRequests(): SavedRequest[] {
  const { collections, items } = collectionTree.get();
  const byId = new Map(items.map((item) => [item.id, item]));
  const collectionNames = new Map(collections.map((collection) => [collection.id, collection.name]));
  return items
    .filter((item) => item.kind === "request")
    .map((item) => {
      const names = [item.name];
      for (
        let folder = byId.get(item.parentId ?? "");
        folder !== undefined;
        folder = byId.get(folder.parentId ?? "")
      ) {
        names.unshift(folder.name);
      }
      names.unshift(collectionNames.get(item.collectionId) ?? "");
      return { id: item.id, name: item.name, method: item.method ?? "GET", path: names.join(" / ") };
    });
}
