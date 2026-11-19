import { app } from "electron";

/** The renderer is served from app://reqlab in production, never from file://. */
export const APP_SCHEME = "app";
export const APP_HOST = "reqlab";
const APP_ENTRY_URL = `${APP_SCHEME}://${APP_HOST}/index.html`;

/** The Vite dev server, only when running unpackaged with `pnpm dev`. */
export function getDevelopmentServerUrl(): URL | undefined {
  const url = process.env["ELECTRON_RENDERER_URL"];
  if (app.isPackaged || url === undefined) return undefined;
  return new URL(url);
}

export function isDevelopment(): boolean {
  return getDevelopmentServerUrl() !== undefined;
}

export function getRendererEntryUrl(): string {
  return getDevelopmentServerUrl()?.href ?? APP_ENTRY_URL;
}

/** True only for pages that belong to ReqLab's own UI. */
export function isTrustedRendererUrl(url: string): boolean {
  const parsed = parseUrl(url);
  if (parsed === undefined) return false;
  if (parsed.protocol === `${APP_SCHEME}:` && parsed.host === APP_HOST) return true;
  const developmentServer = getDevelopmentServerUrl();
  return developmentServer !== undefined && parsed.origin === developmentServer.origin;
}

export function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}
