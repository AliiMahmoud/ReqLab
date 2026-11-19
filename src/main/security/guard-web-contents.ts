import { app, type WebContents } from "electron";
import { isTrustedRendererUrl } from "./app-origin";

/** Applies to every window, frame and view Electron ever creates. */
export function guardAllWebContents(): void {
  app.on("web-contents-created", (_event, contents) => {
    guardWebContents(contents);
  });
}

function guardWebContents(contents: WebContents): void {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-navigate", (event) => {
    if (!isTrustedRendererUrl(event.url)) event.preventDefault();
  });
  contents.on("will-redirect", (event) => {
    if (!isTrustedRendererUrl(event.url)) event.preventDefault();
  });
  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
}
