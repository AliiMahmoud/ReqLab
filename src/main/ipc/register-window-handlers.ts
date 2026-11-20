import { BrowserWindow } from "electron";
import { applyWindowTheme, setWindowModal } from "../security/title-bar";
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
  // A dialog is open in the page: the window's own buttons wait until it closes.
  router.handle("window:set-modal", ({ isOpen }) => {
    for (const window of BrowserWindow.getAllWindows()) setWindowModal(window, isOpen);
    return true as const;
  });
}
