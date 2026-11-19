import { randomUUID } from "node:crypto";
import { accessSync, constants, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import { InvalidInput } from "../errors";
import { currentDataFolder } from "./data-location";
import { DATA_ITEMS, isInside } from "./move-data-folder";

/** Folders picked in main's dialog, by one-time token: the UI never sends a path of its own. */
const chosen = new Map<string, string>();

/**
 * Main's folder dialog for Settings › Data folder. The data goes into a "ReqLab" folder inside the
 * chosen one. Undefined when cancelled; throws when the place cannot hold the data.
 */
export async function chooseDataFolder(): Promise<{ token: string; path: string } | undefined> {
  const options: OpenDialogOptions = {
    title: "Choose where ReqLab keeps its data",
    buttonLabel: "Use this folder",
    properties: ["openDirectory", "createDirectory"],
  };
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const result =
    window === undefined
      ? await dialog.showOpenDialog(options)
      : await dialog.showOpenDialog(window, options);
  const folder = result.canceled ? undefined : result.filePaths[0];
  if (folder === undefined) return undefined;
  const target = join(resolve(folder), "ReqLab");
  checkTarget(target, resolve(folder));
  const token = randomUUID();
  chosen.set(token, target);
  return { token, path: target };
}

/** The folder a token stands for (once). */
export function takeChosenFolder(token: string): string {
  const target = chosen.get(token);
  if (target === undefined) throw new InvalidInput("Choose the folder again.");
  chosen.delete(token);
  return target;
}

function checkTarget(target: string, parent: string): void {
  const current = resolve(currentDataFolder());
  if (target === current) throw new InvalidInput("ReqLab already keeps its data there.");
  if (isInside(target, current) || isInside(current, target))
    throw new InvalidInput("Choose a folder outside the current data folder.");
  if (DATA_ITEMS.some((item) => existsSync(join(target, item))))
    throw new InvalidInput(`${target} already holds ReqLab data. Choose another folder.`);
  try {
    accessSync(parent, constants.W_OK);
  } catch {
    throw new InvalidInput("ReqLab cannot write to that folder. Choose another one.");
  }
}
