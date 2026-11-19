import { contextBridge, ipcRenderer } from "electron";
import { apiMethods, type ReqLabApi } from "@shared/api";
import { isMenuCommand, MainEvents, type MenuCommand } from "@shared/main-events";

/**
 * The only door between the UI and the main process.
 * It exposes one named function per contract channel, never ipcRenderer itself,
 * and never passes Electron event objects to the UI.
 */
const invokers = Object.fromEntries(
  Object.entries(apiMethods).map(([method, channel]) => [
    method,
    (input?: unknown) => ipcRenderer.invoke(channel, input),
  ]),
);

const api = {
  ...invokers,
  onWorkspacesLocked: (listener: () => void) => {
    const handler = (): void => {
      listener();
    };
    ipcRenderer.on(MainEvents.workspacesLocked, handler);
    return () => {
      ipcRenderer.removeListener(MainEvents.workspacesLocked, handler);
    };
  },
  onMenuCommand: (listener: (command: MenuCommand) => void) => {
    // Only known command names reach the UI; the Electron event object never does.
    const handler = (_event: unknown, command: unknown): void => {
      if (isMenuCommand(command)) listener(command);
    };
    ipcRenderer.on(MainEvents.menuCommand, handler);
    return () => {
      ipcRenderer.removeListener(MainEvents.menuCommand, handler);
    };
  },
} as ReqLabApi;

contextBridge.exposeInMainWorld("reqlab", Object.freeze(api));
