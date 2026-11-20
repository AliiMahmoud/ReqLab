import type { IpcRouter } from "./ipc-router";
import type { IpcServices } from "./ipc-services";

export function registerHttpHandlers(router: IpcRouter, services: IpcServices): void {
  const { data, sender, clipboard } = services;
  registerNetworkLogHandlers(router, services);
  router.handle("http:send", (input) => sender.send(input));
  router.handle("http:copy-as-curl", async (input) => {
    const { curl, containsSecrets } = await sender.buildCurl(input);
    await (containsSecrets ? clipboard.copySecret(curl) : clipboard.copyText(curl));
    return { containsSecrets };
  });
  router.handle("http:cancel", ({ requestId }) => {
    sender.cancel(requestId);
    return true as const;
  });
  router.handle("cookies:list", ({ workspaceId }) => data.cookies(workspaceId).list(new Date()));
  router.handle("cookies:delete", ({ workspaceId, ...key }) => {
    data.cookies(workspaceId).delete(key);
    return true as const;
  });
  router.handle("cookies:clear", ({ workspaceId }) => {
    data.cookies(workspaceId).clear();
    return true as const;
  });
  router.handle("history:list", ({ workspaceId }) => data.history(workspaceId).list());
  router.handle("history:clear", ({ workspaceId }) => {
    data.history(workspaceId).clear();
    return true as const;
  });
}

/** The Log button: a recent send's network log (already masked), shown, or copied as JSON. */
function registerNetworkLogHandlers(router: IpcRouter, { sender, clipboard }: IpcServices): void {
  router.handle("http:get-log", ({ requestId }) => sender.getLog(requestId));
  // Copied by main because the UI has no clipboard access.
  router.handle("http:copy-log", async ({ requestId }) => {
    const log = sender.getLog(requestId);
    await clipboard.copyText(log === null ? "" : JSON.stringify(log, null, 2));
    return true as const;
  });
}
