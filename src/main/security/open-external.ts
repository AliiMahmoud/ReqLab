import { dialog, shell, type BrowserWindow } from "electron";
import { parseUrl } from "./app-origin";

/**
 * The only way ReqLab opens anything outside itself: https links only,
 * no embedded credentials, and the user confirms the exact address first.
 */
export async function openExternalSafely(url: string, parent: BrowserWindow): Promise<boolean> {
  const target = parseSafeExternalUrl(url);
  if (target === undefined) return false;
  if (!(await userConfirmsOpening(target, parent))) return false;
  await shell.openExternal(target.href);
  return true;
}

function parseSafeExternalUrl(url: string): URL | undefined {
  const parsed = parseUrl(url);
  const isSafe = parsed?.protocol === "https:" && parsed.username === "" && parsed.password === "";
  return isSafe ? parsed : undefined;
}

async function userConfirmsOpening(target: URL, parent: BrowserWindow): Promise<boolean> {
  const { response } = await dialog.showMessageBox(parent, {
    type: "question",
    buttons: ["Open in browser", "Cancel"],
    defaultId: 1,
    cancelId: 1,
    message: "Open this link in your browser?",
    detail: target.href,
  });
  return response === 0;
}
