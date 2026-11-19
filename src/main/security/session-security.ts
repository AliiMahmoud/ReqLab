import type { Session } from "electron";
import { getDevelopmentServerUrl, isTrustedRendererUrl, parseUrl } from "./app-origin";
import { buildContentSecurityPolicy } from "./content-security-policy";

/**
 * Locks down the browser session the UI runs in:
 * no permissions, no downloads, and no network requests except to ReqLab's own UI.
 * API requests are sent by the main process, which does not go through this session.
 */
export function lockDownSession(session: Session): void {
  session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.setPermissionCheckHandler(() => false);
  session.setDevicePermissionHandler(() => false);
  session.on("will-download", (event) => {
    event.preventDefault();
  });
  blockRendererNetworkRequests(session);
  if (getDevelopmentServerUrl() !== undefined) addDevelopmentContentSecurityPolicy(session);
}

function blockRendererNetworkRequests(session: Session): void {
  session.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, (details, callback) => {
    callback({ cancel: !isAllowedRendererRequest(details.url) });
  });
}

function isAllowedRendererRequest(url: string): boolean {
  if (isTrustedRendererUrl(url)) return true;
  const developmentServer = getDevelopmentServerUrl();
  const parsed = parseUrl(url);
  // Vite's hot-reload websocket, development only.
  return (
    developmentServer !== undefined && parsed?.protocol === "ws:" && parsed.host === developmentServer.host
  );
}

function addDevelopmentContentSecurityPolicy(session: Session): void {
  const policy = buildContentSecurityPolicy(true);
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [policy] } });
  });
}
