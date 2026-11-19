import type { ContainerSettings, InheritedAuth } from "@shared/models/scripts";
import type { WorkspaceData } from "./workspace-data";

/** A collection's or folder's settings window: its description, auth and scripts together. */
export function readContainerSettings(
  data: WorkspaceData,
  workspaceId: string,
  id: string,
): ContainerSettings {
  return {
    description: data.containerDescriptions(workspaceId).read(id),
    auth: data.containerAuth(workspaceId).read(id),
    scripts: data.containerScripts(workspaceId).read(id),
  };
}

export function saveContainerSettings(
  data: WorkspaceData,
  workspaceId: string,
  change: { id: string; settings: ContainerSettings },
): void {
  const { id, settings } = change;
  data.containerDescriptions(workspaceId).write(id, settings.description);
  data.containerAuth(workspaceId).write(id, settings.auth);
  data.containerScripts(workspaceId).write(id, settings.scripts);
}

/** Walks up from a request: the first folder (or the collection) whose auth is not "inherit". */
export function findInheritedAuth(data: WorkspaceData, workspaceId: string, itemId: string): InheritedAuth {
  const tree = data.collections(workspaceId).readTree();
  const auth = data.containerAuth(workspaceId);
  const byId = new Map(tree.items.map((item) => [item.id, item]));
  const item = byId.get(itemId);
  for (
    let folder = byId.get(item?.parentId ?? "");
    folder !== undefined;
    folder = byId.get(folder.parentId ?? "")
  ) {
    const own = auth.read(folder.id);
    if (own.type !== "inherit")
      return { type: own.type, from: { id: folder.id, name: folder.name, kind: "folder" } };
  }
  const collection = tree.collections.find((candidate) => candidate.id === item?.collectionId);
  if (collection === undefined) return { type: "none", from: null };
  const own = auth.read(collection.id);
  if (own.type === "inherit") return { type: "none", from: null };
  return { type: own.type, from: { id: collection.id, name: collection.name, kind: "collection" } };
}
