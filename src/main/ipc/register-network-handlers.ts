import type { IpcRouter } from "./ipc-router";
import type { IpcServices } from "./ipc-services";

export function registerNetworkHandlers(
  router: IpcRouter,
  { networkSettings, requestSettings }: IpcServices,
): void {
  router.handle("request-settings:get", ({ workspaceId }) => requestSettings.view(workspaceId));
  router.handle("request-settings:update", ({ workspaceId, settings }) =>
    requestSettings.update(workspaceId, settings),
  );
  router.handle("network:get", ({ workspaceId }) => networkSettings.view(workspaceId));
  router.handle("network:update", (input) => networkSettings.update(input));
  router.handle("network:add-ca", ({ workspaceId }) => networkSettings.addCaCertificate(workspaceId));
  router.handle("network:add-client-certificate", ({ workspaceId, ...request }) =>
    networkSettings.addClientCertificate(workspaceId, request),
  );
  router.handle("network:remove-certificate", ({ workspaceId, id }) =>
    networkSettings.removeCertificate(workspaceId, id),
  );
}
