import { app } from "electron";
import { registerAppSchemeAsPrivileged } from "./app-protocol";
import { guardAllWebContents } from "./guard-web-contents";

/** Everything that must happen before Electron is ready. */
export function applySecurityBeforeReady(): void {
  // Every file ReqLab creates (databases, WAL files, keys.json) is readable by the current user only.
  // No effect on Windows, where the profile folder's ACL already does this.
  process.umask(0o077);
  app.enableSandbox();
  registerAppSchemeAsPrivileged();
  guardAllWebContents();
}
