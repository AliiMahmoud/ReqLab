import type { Channel, ChannelInput, ChannelOutput } from "./ipc-contract";
import type { MenuCommand } from "./main-events";
import type { Result } from "./result";

/** The friendly method names the renderer sees, mapped to IPC channels. Kept free of zod so preload stays tiny. */
export const apiMethods = {
  getSecurityStatus: "app:get-security-status",
  listWorkspaces: "workspaces:list",
  getDataLocation: "storage:get-location",
  chooseDataFolder: "storage:choose-folder",
  moveData: "storage:move",
  restartsItself: "storage:restarts-itself",
  moveDataToStandard: "storage:move-to-standard",
  getLastWorkspace: "workspaces:get-last",
  setLastWorkspace: "workspaces:set-last",
  createWorkspace: "workspaces:create",
  unlockWorkspace: "workspaces:unlock",
  lockWorkspace: "workspaces:lock",
  renameWorkspace: "workspaces:rename",
  deleteWorkspace: "workspaces:delete",
  chooseImportFiles: "import:choose-files",
  runImport: "import:run",
  exportWorkspace: "export:workspace",
  setWindowTheme: "window:set-theme",
  setWindowZoom: "window:set-zoom",
  setWindowModal: "window:set-modal",
  getOAuth2Status: "oauth2:status",
  getOAuth2Token: "oauth2:get-token",
  clearOAuth2Token: "oauth2:clear",
  parseCurl: "import:parse-curl",
  importIntoWorkspace: "import:into-workspace",
  exportCollection: "export:collection",
  exportSelection: "export:selection",
  getRequestSettings: "request-settings:get",
  updateRequestSettings: "request-settings:update",
  getNetworkSettings: "network:get",
  updateNetworkSettings: "network:update",
  addCaCertificate: "network:add-ca",
  addClientCertificate: "network:add-client-certificate",
  removeCertificate: "network:remove-certificate",
  describeSystemProxy: "network:describe-system-proxy",
  getCollectionTree: "collections:get-tree",
  createCollection: "collections:create",
  createItem: "collections:create-item",
  renameEntity: "collections:rename",
  deleteEntity: "collections:delete",
  moveItem: "collections:move-item",
  moveCollection: "collections:move",
  duplicateEntry: "collections:duplicate",
  getContainerAuth: "collections:get-auth",
  saveContainerAuth: "collections:save-auth",
  getContainerSettings: "containers:get-settings",
  saveContainerSettings: "containers:save-settings",
  getInheritedAuth: "requests:inherited-auth",
  getRequest: "requests:get",
  copyRequestId: "requests:copy-id",
  saveRequest: "requests:save",
  listEnvironments: "environments:list",
  createEnvironment: "environments:create",
  renameEnvironment: "environments:rename",
  deleteEnvironment: "environments:delete",
  duplicateEnvironment: "environments:duplicate",
  setEnvironmentProtected: "environments:set-protected",
  setEnvironmentColor: "environments:set-color",
  getVariables: "variables:get",
  saveVariables: "variables:save",
  listVisibleVariables: "variables:list-visible",
  setVariableValue: "variables:set-value",
  sendRequest: "http:send",
  cancelRequest: "http:cancel",
  copyAsCurl: "http:copy-as-curl",
  getNetworkLog: "http:get-log",
  copyNetworkLog: "http:copy-log",
  listCookies: "cookies:list",
  deleteCookie: "cookies:delete",
  clearCookies: "cookies:clear",
  listHistory: "history:list",
  clearHistory: "history:clear",
  getOpenTabs: "tabs:get",
  saveOpenTabs: "tabs:save",
} as const satisfies Record<string, Channel>;

type ApiMethod<C extends Channel> =
  ChannelInput<C> extends undefined
    ? () => Promise<Result<ChannelOutput<C>>>
    : (input: ChannelInput<C>) => Promise<Result<ChannelOutput<C>>>;

export type ReqLabApi = {
  [M in keyof typeof apiMethods]: ApiMethod<(typeof apiMethods)[M]>;
} & {
  /** Called for menu shortcuts (new tab, close tab, reopen closed tab). Returns an unsubscribe function. */
  onMenuCommand: (listener: (command: MenuCommand) => void) => () => void;
};
