import { BrowserWindow, dialog, type SaveDialogOptions } from "electron";

/** Asks where to save a file, over the app's window; undefined when cancelled. */
export async function showSaveDialog(
  title: string,
  defaultName: string,
  filter: { name: string; extensions: string[] },
): Promise<string | undefined> {
  const options: SaveDialogOptions = { title, defaultPath: defaultName, filters: [filter] };
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const result =
    window === undefined
      ? await dialog.showSaveDialog(options)
      : await dialog.showSaveDialog(window, options);
  return result.canceled ? undefined : result.filePath;
}

/** A name usable as a file name on every platform. */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}
