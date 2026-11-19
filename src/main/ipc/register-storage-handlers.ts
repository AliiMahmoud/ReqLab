import { app } from "electron";
import { describeDataLocation, scheduleDataMove } from "../storage/data-location";
import { chooseDataFolder, takeChosenFolder } from "../storage/choose-data-folder";
import type { IpcRouter } from "./ipc-router";

/**
 * Moves happen on the next start, while nothing has the files open: record it, answer, then close.
 * A packaged app opens again by itself; in development (pnpm dev) the dev server ends with the app,
 * so it is started again by hand.
 */
function restartSoon(): void {
  setTimeout(() => {
    if (app.isPackaged) app.relaunch();
    app.quit();
  }, 300);
}

/** Settings › General › Data folder. */
export function registerStorageHandlers(router: IpcRouter): void {
  router.handle("storage:get-location", () => describeDataLocation());
  router.handle("storage:choose-folder", async () => (await chooseDataFolder()) ?? null);
  router.handle("storage:restarts-itself", () => app.isPackaged);
  router.handle("storage:move", ({ token }) => {
    if (describeDataLocation().isPortable) throw new Error("Portable mode keeps its data next to the app.");
    scheduleDataMove(takeChosenFolder(token));
    restartSoon();
    return true as const;
  });
  router.handle("storage:move-to-standard", () => {
    scheduleDataMove(undefined);
    restartSoon();
    return true as const;
  });
}
