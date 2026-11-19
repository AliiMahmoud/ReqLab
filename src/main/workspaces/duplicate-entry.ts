import { MAX_NAME_LENGTH } from "@shared/limits";
import type { TreeItem } from "@shared/models/collection";
import { ItemNotFound } from "../errors";
import type { WorkspaceData } from "./workspace-data";

/** What a duplicate is called: "Orders" → "Orders copy" (kept within the name limit). */
function copyName(name: string): string {
  return `${name.slice(0, MAX_NAME_LENGTH - 5)} copy`;
}

/**
 * Duplicates a collection, folder or request with everything inside it (requests, folder and
 * collection auth, descriptions, collection variables). The copy is placed right after the original.
 * Returns the copy's id.
 */
export function duplicateEntry(data: WorkspaceData, workspaceId: string, id: string): string {
  const tree = data.collections(workspaceId).readTree();
  const collection = tree.collections.find((candidate) => candidate.id === id);
  if (collection !== undefined)
    return duplicateCollection(data, workspaceId, { id, name: collection.name, items: tree.items });
  const item = tree.items.find((candidate) => candidate.id === id);
  if (item === undefined) throw new ItemNotFound();
  const copyId = copyItem(data, workspaceId, {
    item,
    items: tree.items,
    collectionId: item.collectionId,
    parentId: item.parentId,
    name: copyName(item.name),
  });
  const siblings = tree.items.filter(
    (sibling) => sibling.collectionId === item.collectionId && sibling.parentId === item.parentId,
  );
  const next = siblings[siblings.findIndex((sibling) => sibling.id === id) + 1];
  data.collections(workspaceId).moveItem(copyId, {
    collectionId: item.collectionId,
    parentId: item.parentId,
    beforeItemId: next?.id ?? null,
  });
  return copyId;
}

function duplicateCollection(
  data: WorkspaceData,
  workspaceId: string,
  original: { id: string; name: string; items: TreeItem[] },
): string {
  const collections = data.collections(workspaceId);
  const copy = collections.createCollection(copyName(original.name));
  copyContainerDetails(data, workspaceId, { fromId: original.id, toId: copy.id });
  const variables = data.variables(workspaceId);
  variables.replaceAll(
    { scope: "collection", id: copy.id },
    variables.list({ scope: "collection", id: original.id }),
  );
  for (const child of original.items.filter(
    (item) => item.collectionId === original.id && item.parentId === null,
  )) {
    copyItem(data, workspaceId, {
      item: child,
      items: original.items,
      collectionId: copy.id,
      parentId: null,
      name: child.name,
    });
  }
  const order = collections.readTree().collections.map((collection) => collection.id);
  collections.moveCollection(copy.id, order[order.indexOf(original.id) + 1] ?? null);
  return copy.id;
}

interface CopyTarget {
  item: TreeItem;
  items: TreeItem[];
  collectionId: string;
  parentId: string | null;
  name: string;
}

/** Copies one request, or a folder and (recursively) everything in it, under `parentId`. */
function copyItem(data: WorkspaceData, workspaceId: string, target: CopyTarget): string {
  const { item, items } = target;
  const copy = data.collections(workspaceId).createItem({
    collectionId: target.collectionId,
    parentId: target.parentId,
    kind: item.kind,
    name: target.name,
  });
  if (item.kind === "request") {
    data.requests(workspaceId).save(copy.id, data.requests(workspaceId).get(item.id));
    return copy.id;
  }
  copyContainerDetails(data, workspaceId, { fromId: item.id, toId: copy.id });
  for (const child of items.filter((candidate) => candidate.parentId === item.id)) {
    copyItem(data, workspaceId, {
      item: child,
      items,
      collectionId: target.collectionId,
      parentId: copy.id,
      name: child.name,
    });
  }
  return copy.id;
}

function copyContainerDetails(
  data: WorkspaceData,
  workspaceId: string,
  { fromId, toId }: { fromId: string; toId: string },
): void {
  const auth = data.containerAuth(workspaceId).read(fromId);
  if (auth.type !== "inherit") data.containerAuth(workspaceId).write(toId, auth);
  const description = data.containerDescriptions(workspaceId).read(fromId);
  if (description !== "") data.containerDescriptions(workspaceId).write(toId, description);
  const scripts = data.containerScripts(workspaceId).read(fromId);
  if (scripts.preRequest !== "" || scripts.postResponse !== "")
    data.containerScripts(workspaceId).write(toId, scripts);
}
