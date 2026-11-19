const IS_MAC = navigator.userAgent.includes("Mac");

const MAC_SYMBOLS: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥", Enter: "↵" };

/** "Mod+Enter" → "⌘↵" on macOS, "Ctrl+Enter" elsewhere. For tooltips. */
export function shortcutLabel(keys: string): string {
  const parts = keys.split("+");
  if (IS_MAC) return parts.map((part) => MAC_SYMBOLS[part] ?? part).join("");
  return parts.map((part) => (part === "Mod" ? "Ctrl" : part)).join("+");
}

/** "Mod+Shift+T" → ["⌘", "⇧", "T"] on macOS, ["Ctrl", "Shift", "T"] elsewhere: one key cap each. */
export function shortcutKeys(keys: string): string[] {
  const parts = keys.split("+");
  if (!IS_MAC) return parts.map((part) => (part === "Mod" ? "Ctrl" : part));
  const symbols = parts.map((part) => MAC_SYMBOLS[part] ?? part);
  // macOS lists Shift before Command (⇧⌘T).
  return symbols.includes("⇧") ? ["⇧", ...symbols.filter((symbol) => symbol !== "⇧")] : symbols;
}

/** "Send" + "Mod+Enter" → "Send (⌘↵)". */
export function withShortcut(label: string, keys: string): string {
  return `${label} (${shortcutLabel(keys)})`;
}
