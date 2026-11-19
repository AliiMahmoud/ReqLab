import type { IpcRouter } from "./ipc-router";
import type { IpcServices } from "./ipc-services";

export function registerHttpHandlers(router: IpcRouter, { data, sender, clipboard }: IpcServices): void {
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
