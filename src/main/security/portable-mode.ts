import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";

const PORTABLE_FLAG_FILE = "portable.flag";
const PORTABLE_DATA_FOLDER = "ReqLab Data";

/**
 * If portable.flag sits next to the app, keep all data beside it instead of in the user profile.
 * Returns whether it does (portable data cannot be moved from Settings).
 */
export function usePortableDataFolderIfPresent(): boolean {
  // electron-builder's Windows portable build runs from a temp folder and reports the real one here.
  const appFolder = process.env["PORTABLE_EXECUTABLE_DIR"] ?? dirname(app.getPath("exe"));
  if (!existsSync(join(appFolder, PORTABLE_FLAG_FILE))) return false;
  app.setPath("userData", join(appFolder, PORTABLE_DATA_FOLDER));
  return true;
}
