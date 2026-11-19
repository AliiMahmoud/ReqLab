import { OpenTabsStore } from "../workspaces/open-tabs-store";
import type { IpcRouter } from "./ipc-router";
import type { IpcServices } from "./ipc-services";

export function registerRequestHandlers(router: IpcRouter, { data, clipboard }: IpcServices): void {
  const openTabs = new OpenTabsStore(data);
  router.handle("requests:get", ({ workspaceId, itemId }) => data.requests(workspaceId).get(itemId));
  // Copies only the ID of a request that exists (for pm.execution.runRequest).
  router.handle("requests:copy-id", async ({ workspaceId, itemId }) => {
    data.requests(workspaceId).get(itemId);
    await clipboard.copyText(itemId);
    return true as const;
  });
  router.handle("requests:save", ({ workspaceId, itemId, definition }) => {
    data.requests(workspaceId).save(itemId, definition);
    return true as const;
  });
  router.handle("tabs:get", ({ workspaceId }) => openTabs.read(workspaceId));
  router.handle("tabs:save", ({ workspaceId, openTabs: state }) => {
    openTabs.write(workspaceId, state);
    return true as const;
  });
}
