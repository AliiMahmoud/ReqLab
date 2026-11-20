import { app, BrowserWindow, type WebPreferences } from "electron";
import { MainEvents } from "@shared/main-events";
import { getRendererEntryUrl } from "./app-origin";
import { setWindowModal, titleBarOptions } from "./title-bar";

export async function openMainWindow(preloadPath: string): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "ReqLab",
    ...titleBarOptions(),
    webPreferences: secureWebPreferences(preloadPath),
  });
  window.once("ready-to-show", () => {
    window.show();
  });
  // A two-finger swipe on a macOS trackpad goes back / forward, as in a browser.
  window.on("swipe", (_event, direction) => {
    if (direction === "left") window.webContents.send(MainEvents.menuCommand, "go-back");
    if (direction === "right") window.webContents.send(MainEvents.menuCommand, "go-forward");
  });
  releaseButtonsWhenPageIsGone(window);
  await window.loadURL(getRendererEntryUrl());
  return window;
}

/** A page that reloads, crashes or hangs cannot close its dialog: the window must stay closable. */
function releaseButtonsWhenPageIsGone(window: BrowserWindow): void {
  const release = (): void => {
    setWindowModal(window, false);
  };
  window.webContents.on("did-start-loading", release);
  window.webContents.on("render-process-gone", release);
  window.on("unresponsive", release);
}

function secureWebPreferences(preloadPath: string): WebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    navigateOnDragDrop: false,
    spellcheck: false,
    experimentalFeatures: false,
    enableWebSQL: false,
    devTools: !app.isPackaged,
  };
}
