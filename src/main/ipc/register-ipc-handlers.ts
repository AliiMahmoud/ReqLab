import type { IpcRouter } from "./ipc-router";
import type { IpcServices } from "./ipc-services";
import { registerCollectionHandlers } from "./register-collection-handlers";
import { registerEnvironmentHandlers } from "./register-environment-handlers";
import { registerHttpHandlers } from "./register-http-handlers";
import { registerInteropHandlers } from "./register-interop-handlers";
import { registerNetworkHandlers } from "./register-network-handlers";
import { registerOAuth2Handlers } from "./register-oauth2-handlers";
import { registerWindowHandlers } from "./register-window-handlers";
import { registerStorageHandlers } from "./register-storage-handlers";
import { registerRequestHandlers } from "./register-request-handlers";

export type { IpcServices } from "./ipc-services";

/** One line per channel: which service method answers it. */
export function registerIpcHandlers(router: IpcRouter, services: IpcServices): void {
  registerWorkspaceHandlers(router, services);
  registerCollectionHandlers(router, services);
  registerRequestHandlers(router, services);
  registerEnvironmentHandlers(router, services);
  registerHttpHandlers(router, services);
  registerInteropHandlers(router, services);
  registerNetworkHandlers(router, services);
  registerOAuth2Handlers(router, services);
  registerWindowHandlers(router);
  registerStorageHandlers(router);
}

function registerWorkspaceHandlers(router: IpcRouter, { keys, workspaces }: IpcServices): void {
  router.handle("app:get-security-status", async () => ({
    keyProtection: keys.keyProtectionName(),
    isMasterPasswordRequired: await keys.isMasterPasswordRequired(),
  }));
  router.handle("workspaces:list", () => workspaces.listWorkspaces());
  router.handle("workspaces:get-last", () => workspaces.findLastWorkspace());
  router.handle("workspaces:set-last", ({ workspaceId }) => {
    workspaces.rememberLastWorkspace(workspaceId);
    return true as const;
  });
  router.handle("workspaces:create", (input) => workspaces.createWorkspace(input));
  router.handle("workspaces:unlock", (input) => workspaces.unlockWorkspace(input));
  router.handle("workspaces:lock", (input) => workspaces.lockWorkspace(input.workspaceId));
  router.handle("workspaces:rename", (input) => workspaces.renameWorkspace(input.workspaceId, input.name));
  router.handle("workspaces:delete", (input) => {
    workspaces.deleteWorkspace(input.workspaceId, input.confirmationName);
    return true as const;
  });
}
