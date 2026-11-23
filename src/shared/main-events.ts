/** Messages main pushes to the renderer. They carry no secrets. Kept free of zod so preload stays tiny. */
export const MainEvents = {
  menuCommand: "event:menu-command",
} as const;

/** Commands the application menu (and its keyboard shortcuts) sends to the UI. */
export const MenuCommands = [
  "send-request",
  "save-request",
  "new-tab",
  "close-tab",
  "reopen-closed-tab",
  "toggle-response",
  "beautify",
  "focus-search",
  "duplicate",
  "go-back",
  "go-forward",
] as const;
export type MenuCommand = (typeof MenuCommands)[number];

export function isMenuCommand(value: unknown): value is MenuCommand {
  return typeof value === "string" && (MenuCommands as readonly string[]).includes(value);
}
