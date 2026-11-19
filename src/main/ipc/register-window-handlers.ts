import { BrowserWindow } from "electron";
import { applyWindowTheme } from "../security/title-bar";
import type { IpcRouter } from "./ipc-router";

export function registerWindowHandlers(router: IpcRouter): void {
  // ReqLab has one window; its title bar follows the app's light or dark theme.
  // Settings › App size: the whole page scales, like the browser's zoom.
  router.handle("window:set-zoom", ({ factor }) => {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.setZoomFactor(factor);
    return true as const;
  });
  router.handle("window:set-theme", ({ theme, colors }) => {
    for (const window of BrowserWindow.getAllWindows()) applyWindowTheme(window, theme, colors);
    return true as const;
  });
}
