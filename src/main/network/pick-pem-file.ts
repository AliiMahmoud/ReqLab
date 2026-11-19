import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import { InvalidInput } from "../errors";

const MAX_PEM_BYTES = 100_000;

/** Main's own open dialog for a PEM file; the UI never chooses a path. Undefined when cancelled. */
export async function pickPemFile(title: string): Promise<{ name: string; pem: string } | undefined> {
  const options: OpenDialogOptions = {
    title,
    properties: ["openFile"],
    filters: [{ name: "PEM", extensions: ["pem", "crt", "cer", "key"] }],
  };
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const result =
    window === undefined
      ? await dialog.showOpenDialog(options)
      : await dialog.showOpenDialog(window, options);
  const path = result.canceled ? undefined : result.filePaths[0];
  if (path === undefined) return undefined;
  if ((await stat(path)).size > MAX_PEM_BYTES)
    throw new InvalidInput("The file is too large to be a PEM file.");
  const pem = await readFile(path, "utf8");
  if (!pem.includes("-----BEGIN "))
    throw new InvalidInput("That is not a PEM file (it has no -----BEGIN line).");
  return { name: basename(path), pem };
}
