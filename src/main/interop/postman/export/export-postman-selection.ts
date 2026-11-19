import { randomUUID } from "node:crypto";
import type { CollectionTree, TreeItem } from "@shared/models/collection";
import type { WorkspaceData } from "../../../workspaces/workspace-data";
import {
  exportFolder,
  exportPostmanCollection,
  exportRequest,
  SCHEMA,
  type ExportContext,
} from "./export-postman-collection";
import type { PostmanCollection } from "./postman-shapes";

/**
 * A multi-selection in the tree as Postman collections: each selected collection whole, and the
 * selected requests / folders (outside those) gathered into one more collection.
 */
export function exportPostmanSelection(
  data: WorkspaceData,
  workspaceId: string,
  ids: readonly string[],
): PostmanCollection[] {
  const tree = data.collections(workspaceId).readTree();
  const selected = new Set(ids);
  const collections = tree.collections.filter((collection) => selected.has(collection.id));
  const looseItems = tree.items.filter(
    (item) => selected.has(item.id) && !isInsideSelection(item, tree, selected),
  );
  const documents = collections.map((collection) =>
    exportPostmanCollection(data, workspaceId, collection.id),
  );
  if (looseItems.length > 0)
    documents.push(gatherIntoCollection({ data, workspaceId, items: tree.items }, looseItems, tree));
  return documents;
}

/** Already exported with a selected collection or folder above it. */
function isInsideSelection(item: TreeItem, tree: CollectionTree, selected: ReadonlySet<string>): boolean {
  if (selected.has(item.collectionId)) return true;
  for (let parentId = item.parentId; parentId !== null;) {
    if (selected.has(parentId)) return true;
    parentId = tree.items.find((candidate) => candidate.id === parentId)?.parentId ?? null;
  }
  return false;
}

function gatherIntoCollection(
  context: ExportContext,
  items: TreeItem[],
  tree: CollectionTree,
): PostmanCollection {
  const [only] = items;
  if (items.length === 1 && only?.kind === "folder") return folderAsCollection(context, only);
  const sourceIds = new Set(items.map((item) => item.collectionId));
  const source = tree.collections.find((collection) => sourceIds.has(collection.id));
  const name = sourceIds.size === 1 && source !== undefined ? `${source.name} (selection)` : "Selected items";
  return {
    info: { _postman_id: randomUUID(), name, schema: SCHEMA },
    item: items.map((item) =>
      item.kind === "folder" ? exportFolder(context, item) : exportRequest(context, item),
    ),
  };
}

/** One folder alone: a collection named after it, with its contents, auth and description. */
function folderAsCollection(context: ExportContext, folder: TreeItem): PostmanCollection {
  const { name, description, auth, item, event } = exportFolder(context, folder);
  return {
    info: {
      _postman_id: randomUUID(),
      name,
      ...(description === undefined ? {} : { description }),
      schema: SCHEMA,
    },
    item,
    ...(event === undefined ? {} : { event }),
    ...(auth === undefined ? {} : { auth }),
  };
}
