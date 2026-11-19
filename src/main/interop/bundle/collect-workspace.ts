import type { Scripts } from "@shared/models/scripts";
import type { TreeItem } from "@shared/models/collection";
import type { VariableOwner } from "@shared/models/environment";
import type { WorkspaceData } from "../../workspaces/workspace-data";
import type { BundleContent, BundleItem } from "./bundle-content";

/** Reads a whole workspace through its repositories, ready to be sealed into a bundle. */
export function collectWorkspace(
  data: WorkspaceData,
  workspaceId: string,
  options: { workspaceName: string; includeEnvironments: boolean },
): BundleContent {
  const tree = data.collections(workspaceId).readTree();
  const readVariables = (owner: VariableOwner): BundleContent["globals"] =>
    data.variables(workspaceId).list(owner);
  return {
    format: "reqlab-workspace",
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaceName: options.workspaceName,
    // There are no secret variables any more: every value is in the bundle.
    includesSecrets: true,
    globals: readVariables({ scope: "global" }),
    collections: tree.collections.map((collection) => ({
      ...collection,
      variables: readVariables({ scope: "collection", id: collection.id }),
      auth: data.containerAuth(workspaceId).read(collection.id),
      ...containerExtras(data, workspaceId, collection.id),
    })),
    items: orderParentsFirst(tree.items).map((item) => toBundleItem(data, workspaceId, item)),
    environments: (options.includeEnvironments ? data.environments(workspaceId).list() : []).map(
      (environment) => ({
        name: environment.name,
        variables: readVariables({ scope: "environment", id: environment.id }),
      }),
    ),
  };
}

function toBundleItem(data: WorkspaceData, workspaceId: string, item: TreeItem): BundleItem {
  const { id, collectionId, parentId, kind, name } = item;
  if (kind === "folder") {
    const auth = data.containerAuth(workspaceId).read(id);
    return { id, collectionId, parentId, kind, name, auth, ...containerExtras(data, workspaceId, id) };
  }
  return { id, collectionId, parentId, kind, name, definition: data.requests(workspaceId).get(id) };
}

function containerExtras(
  data: WorkspaceData,
  workspaceId: string,
  id: string,
): { description: string; scripts: Scripts } {
  return {
    description: data.containerDescriptions(workspaceId).read(id),
    scripts: data.containerScripts(workspaceId).read(id),
  };
}

/** Breadth-first from the top level, keeping each level's order, so a parent is always written first. */
function orderParentsFirst(items: TreeItem[]): TreeItem[] {
  const ordered: TreeItem[] = [];
  let level = items.filter((item) => item.parentId === null);
  while (level.length > 0) {
    ordered.push(...level);
    const parentIds = new Set(level.map((item) => item.id));
    level = items.filter((item) => item.parentId !== null && parentIds.has(item.parentId));
  }
  return ordered;
}
