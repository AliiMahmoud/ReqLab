import { join } from "node:path";
import { app, BrowserWindow, session } from "electron";
import { ChosenFiles } from "./interop/chosen-files";
import { InteropService } from "./interop/interop-service";
import { IpcRouter } from "./ipc/ipc-router";
import { installApplicationMenu } from "./menu/application-menu";
import { registerIpcHandlers, type IpcServices } from "./ipc/register-ipc-handlers";
import { serveRendererFromAppProtocol } from "./security/app-protocol";
import { openMainWindow } from "./security/create-main-window";
import { applySecurityBeforeReady } from "./security/harden-app";
import { usePortableDataFolderIfPresent } from "./security/portable-mode";
import { lockDownSession } from "./security/session-security";
import { AppRegistry } from "./storage/app-registry";
import { openPlainDatabase } from "./storage/database";
import { KeyManager } from "./storage/keys/key-manager";
import { KeyStoreFile } from "./storage/keys/key-store-file";
import { OsKeychain } from "./storage/keys/os-keychain";
import { StoragePaths } from "./storage/storage-paths";
import { applyDataLocation } from "./storage/data-location";
import { OAuth2Service } from "./auth/oauth2/oauth2-service";
import { OAuth2TokenStore } from "./auth/oauth2/token-store";
import { NetworkSettingsStore } from "./network/network-settings-store";
import { RequestSettingsStore } from "./network/request-settings-store";
import { RequestSender } from "./pipeline/request-sender";
import { ClipboardGuard } from "./secrets/clipboard-guard";
import { VariableService } from "./variables/variable-service";
import { WorkspaceData } from "./workspaces/workspace-data";
import { WorkspaceService } from "./workspaces/workspace-service";

const RENDERER_DIRECTORY = join(import.meta.dirname, "../renderer");
const PRELOAD_PATH = join(import.meta.dirname, "../preload/index.cjs");

/** Composition root: the one place where ReqLab's parts are created and connected. */
export async function startApplication(): Promise<void> {
  // Before anything opens its files: portable mode, then the data folder chosen in Settings.
  applyDataLocation(usePortableDataFolderIfPresent());
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  applySecurityBeforeReady();
  await app.whenReady();
  showDevelopmentDockIcon();

  lockDownSession(session.defaultSession);
  installApplicationMenu();
  serveRendererFromAppProtocol(RENDERER_DIRECTORY);

  const services = createServices();
  registerIpcHandlers(new IpcRouter(), services);

  lockEverythingOnExit(services.workspaces);
  focusExistingWindowOnSecondLaunch();
  await openMainWindow(PRELOAD_PATH);
}

function createServices(): IpcServices {
  const paths = new StoragePaths(app.getPath("userData"));
  const keys = new KeyManager(new OsKeychain(), new KeyStoreFile(paths.keyFile()));
  const registry = new AppRegistry(openPlainDatabase(paths.appDatabase()));
  const workspaces = new WorkspaceService(registry, keys, paths);
  const variables = new VariableService(workspaces);
  const data = new WorkspaceData(workspaces);
  const networkSettings = new NetworkSettingsStore(data);
  const requestSettings = new RequestSettingsStore(data, networkSettings);
  const oauth2 = new OAuth2Service(new OAuth2TokenStore(data), networkSettings);
  return {
    keys,
    workspaces,
    variables,
    data,
    sender: new RequestSender(workspaces, variables, { data, networkSettings, requestSettings, oauth2 }),
    networkSettings,
    requestSettings,
    oauth2,
    interop: new InteropService(workspaces, data, new ChosenFiles()),
    clipboard: new ClipboardGuard(),
  };
}

function lockEverythingOnExit(workspaces: WorkspaceService): void {
  app.on("window-all-closed", () => {
    workspaces.lockAll();
    app.quit();
  });
  app.on("before-quit", () => {
    workspaces.lockAll();
  });
}

function focusExistingWindowOnSecondLaunch(): void {
  app.on("second-instance", () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
}

/** Packaged apps carry their icon; while developing, the macOS Dock shows it from resources/. */
function showDevelopmentDockIcon(): void {
  if (app.isPackaged || process.platform !== "darwin") return;
  app.dock?.setIcon(join(app.getAppPath(), "resources", "icon.png"));
}
