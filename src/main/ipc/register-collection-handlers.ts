import { duplicateEntry } from "../workspaces/duplicate-entry";
import type { IpcRouter } from "./ipc-router";
import {
  findInheritedAuth,
  readContainerSettings,
  saveContainerSettings,
} from "../workspaces/container-settings";
import type { IpcServices } from "./ipc-services";

export function registerCollectionHandlers(router: IpcRouter, { data }: IpcServices): void {
  router.handle("collections:get-tree", ({ workspaceId }) => data.collections(workspaceId).readTree());
  router.handle("collections:create", ({ workspaceId, name }) =>
    data.collections(workspaceId).createCollection(name),
  );
  router.handle("collections:create-item", ({ workspaceId, ...item }) =>
    data.collections(workspaceId).createItem(item),
  );
  router.handle("collections:rename", ({ workspaceId, id, name }) => {
    data.collections(workspaceId).rename(id, name);
    return true as const;
  });
  router.handle("collections:delete", ({ workspaceId, id }) => {
    data.collections(workspaceId).delete(id);
    return true as const;
  });
  registerArrangeHandlers(router, data);
  registerSettingsHandlers(router, data);
}

/** Duplicating and reordering collections, folders and requests. */
function registerArrangeHandlers(router: IpcRouter, data: IpcServices["data"]): void {
  router.handle("collections:duplicate", ({ workspaceId, id }) => ({
    id: duplicateEntry(data, workspaceId, id),
  }));
  router.handle("collections:move", ({ workspaceId, id, beforeId }) => {
    data.collections(workspaceId).moveCollection(id, beforeId);
    return true as const;
  });
  router.handle("collections:move-item", ({ workspaceId, itemId, ...target }) => {
    data.collections(workspaceId).moveItem(itemId, target);
    return true as const;
  });
}

/** A collection's or folder's settings: auth, description, scripts; and what a request inherits. */
function registerSettingsHandlers(router: IpcRouter, data: IpcServices["data"]): void {
  router.handle("collections:get-auth", ({ workspaceId, id }) => data.containerAuth(workspaceId).read(id));
  router.handle("collections:save-auth", ({ workspaceId, id, auth }) => {
    data.containerAuth(workspaceId).write(id, auth);
    return true as const;
  });
  router.handle("containers:get-settings", ({ workspaceId, id }) =>
    readContainerSettings(data, workspaceId, id),
  );
  router.handle("containers:save-settings", ({ workspaceId, id, settings }) => {
    saveContainerSettings(data, workspaceId, { id, settings });
    return true as const;
  });
  router.handle("requests:inherited-auth", ({ workspaceId, itemId }) =>
    findInheritedAuth(data, workspaceId, itemId),
  );
}
