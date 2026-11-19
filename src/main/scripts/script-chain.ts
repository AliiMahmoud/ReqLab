import type { Scripts } from "@shared/models/scripts";
import type { WorkspaceData } from "../workspaces/workspace-data";
import type { SandboxScript } from "./script-sandbox";

export type Phase = "prerequest" | "test";

/**
 * The scripts that run for a request in one phase, in Postman's order: the collection's, then each
 * folder's from the outermost in, then the request's own. Empty scripts are left out.
 */
export function collectScripts(
  data: WorkspaceData,
  workspaceId: string,
  request: { itemId: string | null; scripts: Scripts | undefined; phase: Phase },
): SandboxScript[] {
  const field = request.phase === "prerequest" ? "preRequest" : "postResponse";
  const chain: { source: string; scripts: Scripts }[] = [];
  if (request.itemId !== null) chain.push(...containerScripts(data, workspaceId, request.itemId));
  if (request.scripts !== undefined) chain.push({ source: "request", scripts: request.scripts });
  return chain
    .map(({ source, scripts }) => ({ source, code: scripts[field] }))
    .filter((script) => script.code.trim() !== "");
}

function containerScripts(
  data: WorkspaceData,
  workspaceId: string,
  itemId: string,
): { source: string; scripts: Scripts }[] {
  const tree = data.collections(workspaceId).readTree();
  const byId = new Map(tree.items.map((item) => [item.id, item]));
  const item = byId.get(itemId);
  const read = data.containerScripts(workspaceId);
  const folders = [];
  for (
    let folder = byId.get(item?.parentId ?? "");
    folder !== undefined;
    folder = byId.get(folder.parentId ?? "")
  ) {
    folders.unshift({ source: `folder "${folder.name}"`, scripts: read.read(folder.id) });
  }
  const collection = tree.collections.find((candidate) => candidate.id === item?.collectionId);
  const top =
    collection === undefined
      ? []
      : [{ source: `collection "${collection.name}"`, scripts: read.read(collection.id) }];
  return [...top, ...folders];
}
