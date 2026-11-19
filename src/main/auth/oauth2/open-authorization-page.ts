import { BrowserWindow, dialog, shell } from "electron";

/** Shows the exact address first; only on "Open" does the system browser get it. */
export async function openAuthorizationPage(url: URL): Promise<boolean> {
  const options = {
    type: "question" as const,
    buttons: ["Open in browser", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    message: "Sign in with your browser?",
    detail: `ReqLab will open this address to get an OAuth access token:\n\n${url.origin}${url.pathname}`,
  };
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const { response } =
    window === undefined
      ? await dialog.showMessageBox(options)
      : await dialog.showMessageBox(window, options);
  if (response !== 0) return false;
  await shell.openExternal(url.href);
  return true;
}
