import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { protocol } from "electron";
import { APP_HOST, APP_SCHEME, parseUrl } from "./app-origin";
import { buildSecurityHeaders } from "./content-security-policy";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

/** Must run before the app is ready. Makes app:// behave like a secure https origin. */
export function registerAppSchemeAsPrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true } },
  ]);
}

/** Serves the built renderer files, and nothing outside that folder. */
export function serveRendererFromAppProtocol(rendererDirectory: string): void {
  const root = resolve(rendererDirectory);
  protocol.handle(APP_SCHEME, (request) => serveFile(request.url, root));
}

async function serveFile(url: string, root: string): Promise<Response> {
  const filePath = resolveFileInside(root, url);
  if (filePath === undefined) return notFound();
  try {
    const body = await readFile(filePath);
    const contentType = CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream";
    return new Response(body, { headers: { "Content-Type": contentType, ...buildSecurityHeaders(false) } });
  } catch {
    return notFound();
  }
}

/** Blocks path traversal: the resolved path must stay inside the renderer folder. */
function resolveFileInside(root: string, url: string): string | undefined {
  const parsed = parseUrl(url);
  if (parsed?.host !== APP_HOST) return undefined;
  const relativePath = safelyDecode(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
  if (relativePath === undefined || relativePath.includes("\0")) return undefined;
  const filePath = resolve(root, `.${relativePath}`);
  return filePath.startsWith(root + sep) ? filePath : undefined;
}

function safelyDecode(path: string): string | undefined {
  try {
    return decodeURIComponent(path);
  } catch {
    return undefined;
  }
}

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: buildSecurityHeaders(false) });
}
