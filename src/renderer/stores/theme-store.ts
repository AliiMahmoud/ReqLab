import { api } from "../api";
import { DEFAULT_PALETTE, findPalette, type Palette } from "../styles/theme-palettes";
import { signal } from "./signal";

export type ThemeChoice = "system" | "light" | "dark";
type Kind = "light" | "dark";

const STORAGE_KEY = "reqlab.theme";
const PALETTE_KEY = "reqlab.palettes";

/**
 * "system" follows the OS; "light" / "dark" are fixed. Each kind has its own colour theme (e.g. Paper
 * for light, Midnight for dark). Display preferences, kept in local storage.
 */
export const themeChoice = signal<ThemeChoice>(readSavedTheme());
export const palettes = signal<Record<Kind, string>>(readSavedPalettes());

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
systemDark.addEventListener("change", () => {
  if (themeChoice.get() === "system") applyTheme();
});

export function setTheme(choice: ThemeChoice): void {
  themeChoice.set(choice);
  save(STORAGE_KEY, choice);
  applyTheme();
}

/** Picks the colour theme for its kind, and shows it now (switching light / dark if needed). */
export function setPalette(palette: Palette): void {
  palettes.set({ ...palettes.get(), [palette.kind]: palette.id });
  save(PALETTE_KEY, JSON.stringify(palettes.get()));
  if (shownKind() === palette.kind) applyTheme();
  else setTheme(palette.kind);
}

export function shownKind(): Kind {
  const choice = themeChoice.get();
  return choice === "dark" || (choice === "system" && systemDark.matches) ? "dark" : "light";
}

let appliedTokens: readonly string[] = [];

function applyTheme(): void {
  const root = document.documentElement;
  const choice = themeChoice.get();
  if (choice === "system") delete root.dataset["theme"];
  else root.dataset["theme"] = choice;
  const kind = shownKind();
  const palette = findPalette(palettes.get()[kind], kind);
  // Set through the CSSOM (not a style attribute), which the CSP allows.
  for (const token of appliedTokens) root.style.removeProperty(token);
  for (const [token, value] of Object.entries(palette.tokens)) root.style.setProperty(token, value);
  appliedTokens = Object.keys(palette.tokens);
  void api.setWindowTheme({
    theme: kind,
    colors: { surface: palette.preview.surface, symbol: palette.preview.muted },
  });
}

function readSavedTheme(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function readSavedPalettes(): Record<Kind, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PALETTE_KEY) ?? "{}");
    const record = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    const pick = (kind: Kind): string =>
      typeof record[kind] === "string" ? record[kind] : DEFAULT_PALETTE[kind];
    return { light: pick("light"), dark: pick("dark") };
  } catch {
    return { ...DEFAULT_PALETTE };
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts until the window closes.
  }
}

applyTheme();
