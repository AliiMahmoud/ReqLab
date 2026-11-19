import { randomUUID } from "node:crypto";
import type { TreeItem } from "@shared/models/collection";
import type { RequestDefinition } from "@shared/models/request";
import { ItemNotFound } from "../../../errors";
import type { WorkspaceData } from "../../../workspaces/workspace-data";
import { toPostmanEvents } from "../postman-scripts";
import { toPostmanAuth } from "./postman-auth-out";
import { toPostmanBody } from "./postman-body-out";
import { toPostmanRows } from "./postman-rows";
import type { PostmanCollection, PostmanFolder, PostmanRequestItem } from "./postman-shapes";
import { toPostmanUrl } from "./postman-url-out";

export const SCHEMA = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

/** One collection as a Postman Collection v2.1 document (what Postman's own "Export" writes). */
export function exportPostmanCollection(
  data: WorkspaceData,
  workspaceId: string,
  collectionId: string,
): PostmanCollection {
  const tree = data.collections(workspaceId).readTree();
  const collection = tree.collections.find((candidate) => candidate.id === collectionId);
  if (collection === undefined) throw new ItemNotFound();
  const context = {
    data,
    workspaceId,
    items: tree.items.filter((item) => item.collectionId === collectionId),
  };
  const description = data.containerDescriptions(workspaceId).read(collectionId);
  const auth = toPostmanAuth(data.containerAuth(workspaceId).read(collectionId));
  const variables = data.variables(workspaceId).list({ scope: "collection", id: collectionId });
  const event = toPostmanEvents(data.containerScripts(workspaceId).read(collectionId));
  return {
    info: {
      _postman_id: randomUUID(),
      name: collection.name,
      ...(description === "" ? {} : { description }),
      schema: SCHEMA,
    },
    item: exportChildren(context, null),
    ...(event === undefined ? {} : { event }),
    ...(auth === undefined ? {} : { auth }),
    ...(variables.length === 0 ? {} : { variable: toPostmanRows(variables) }),
  };
}

export interface ExportContext {
  data: WorkspaceData;
  workspaceId: string;
  items: TreeItem[];
}

function exportChildren(
  context: ExportContext,
  parentId: string | null,
): (PostmanFolder | PostmanRequestItem)[] {
  return context.items
    .filter((item) => item.parentId === parentId)
    .map((item) => (item.kind === "folder" ? exportFolder(context, item) : exportRequest(context, item)));
}

export function exportFolder(context: ExportContext, folder: TreeItem): PostmanFolder {
  const description = context.data.containerDescriptions(context.workspaceId).read(folder.id);
  const auth = toPostmanAuth(context.data.containerAuth(context.workspaceId).read(folder.id));
  const event = toPostmanEvents(context.data.containerScripts(context.workspaceId).read(folder.id));
  return {
    name: folder.name,
    ...(event === undefined ? {} : { event }),
    ...(description === "" ? {} : { description }),
    ...(auth === undefined ? {} : { auth }),
    item: exportChildren(context, folder.id),
  };
}

export function exportRequest(context: ExportContext, item: TreeItem): PostmanRequestItem {
  const definition: RequestDefinition = context.data.requests(context.workspaceId).get(item.id);
  const auth = toPostmanAuth(definition.auth);
  const body = toPostmanBody(definition.body);
  const event = toPostmanEvents(definition.scripts);
  return {
    name: item.name,
    ...(event === undefined ? {} : { event }),
    request: {
      ...(auth === undefined ? {} : { auth }),
      method: definition.method,
      header: toPostmanRows(definition.headers),
      ...(body === undefined ? {} : { body }),
      url: toPostmanUrl(definition.url, {
        params: definition.params,
        pathVariables: definition.pathVariables ?? [],
      }),
      ...(definition.description === undefined || definition.description === ""
        ? {}
        : { description: definition.description }),
    },
    response: [],
  };
}
