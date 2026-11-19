import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";
import { MainEvents, type MenuCommand } from "@shared/main-events";

const IS_MAC = process.platform === "darwin";

/** Request, tab and layout shortcuts; they work wherever focus is. On macOS they also answer to Ctrl (hidden duplicates), not only Cmd. */
const TAB_COMMANDS: { command: MenuCommand; label: string; key: string }[] = [
  { command: "send-request", label: "Send Request", key: "Enter" },
  { command: "save-request", label: "Save Request", key: "S" },
  { command: "new-tab", label: "New Request Tab", key: "N" },
  { command: "reopen-closed-tab", label: "Reopen Closed Tab", key: "Shift+T" },
  { command: "close-tab", label: "Close Tab", key: "W" },
  { command: "duplicate", label: "Duplicate Request", key: "D" },
  { command: "toggle-response", label: "Toggle Response Panel", key: "Shift+R" },
  { command: "beautify", label: "Beautify Body", key: "B" },
  { command: "focus-search", label: "Search Requests", key: "K" },
];

/**
 * Replaces Electron's default menu, whose Cmd/Ctrl+W closes the window (and so quits ReqLab).
 * Here Cmd/Ctrl+W closes the current request tab; closing the window is Cmd/Ctrl+Shift+W.
 */
export function installApplicationMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildTemplate()));
}

function buildTemplate(): MenuItemConstructorOptions[] {
  return [
    ...(IS_MAC ? [{ role: "appMenu" as const }] : []),
    { label: "File", submenu: [...tabItems(), { type: "separator" }, closeWindowItem()] },
    { role: "editMenu" },
    viewMenu(),
    goMenu(),
    { label: "Window", submenu: [{ role: "minimize" }, ...(IS_MAC ? [{ role: "zoom" as const }] : [])] },
  ];
}

/** Extra keys for the same commands, kept working but not shown (Cmd/Ctrl+T was "new tab" before Cmd/Ctrl+N). */
const HIDDEN_ALIASES: { command: MenuCommand; label: string; key: string }[] = [
  { command: "new-tab", label: "New Request Tab", key: "T" },
];

function hidden(item: MenuItemConstructorOptions): MenuItemConstructorOptions {
  return { ...item, visible: false, acceleratorWorksWhenHidden: true };
}

function tabItems(): MenuItemConstructorOptions[] {
  const shown = TAB_COMMANDS.map(({ command, label, key }) =>
    commandItem(command, label, `CmdOrCtrl+${key}`),
  );
  const aliases = HIDDEN_ALIASES.map(({ command, label, key }) =>
    hidden(commandItem(command, label, `CmdOrCtrl+${key}`)),
  );
  const visible = [...shown, ...aliases];
  if (!IS_MAC) return visible;
  const ctrlVariants = [...TAB_COMMANDS, ...HIDDEN_ALIASES].map(({ command, label, key }) =>
    hidden(commandItem(command, label, `Ctrl+${key}`)),
  );
  return [...visible, ...ctrlVariants];
}

function commandItem(command: MenuCommand, label: string, accelerator: string): MenuItemConstructorOptions {
  return {
    label,
    accelerator,
    click: (_item, window) => {
      if (window instanceof BrowserWindow) window.webContents.send(MainEvents.menuCommand, command);
    },
  };
}

/**
 * Back / forward through the tabs and pages visited, with each platform's usual keys:
 * Cmd+[ and Cmd+] on macOS (as in Safari and Chrome), Alt+Left and Alt+Right elsewhere.
 */
function goMenu(): MenuItemConstructorOptions {
  const [back, forward] = IS_MAC ? ["Cmd+[", "Cmd+]"] : ["Alt+Left", "Alt+Right"];
  return {
    label: "Go",
    submenu: [commandItem("go-back", "Back", back), commandItem("go-forward", "Forward", forward)],
  };
}

function closeWindowItem(): MenuItemConstructorOptions {
  return { label: "Close Window", accelerator: "CmdOrCtrl+Shift+W", role: "close" };
}

/** Reload and developer tools only while developing; zoom always. */
function viewMenu(): MenuItemConstructorOptions {
  const zoom: MenuItemConstructorOptions[] = [{ role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }];
  if (app.isPackaged) return { label: "View", submenu: zoom };
  return {
    label: "View",
    submenu: [{ role: "reload" }, { role: "toggleDevTools" }, { type: "separator" }, ...zoom],
  };
}
