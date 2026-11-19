import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";

/** The app header is the title bar; these must match its height and colours (renderer theme.css). */
export const TITLE_BAR_HEIGHT = 52;
const OVERLAY_COLORS = {
  light: { color: "#f4f5f7", symbolColor: "#545c69" },
  dark: { color: "#13161c", symbolColor: "#9aa3b2" },
} as const;

export type WindowTheme = keyof typeof OVERLAY_COLORS;

/**
 * No native title bar. macOS keeps its traffic lights, inset into the header; Windows and Linux get
 * the system's window buttons drawn over the header's right end, in the theme's colours.
 */
export function titleBarOptions(): BrowserWindowConstructorOptions {
  if (process.platform === "darwin") {
    // The traffic lights are about 14 px tall: centre them in the bar.
    return { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 16, y: (TITLE_BAR_HEIGHT - 14) / 2 } };
  }
  return { titleBarStyle: "hidden", titleBarOverlay: { ...OVERLAY_COLORS.dark, height: TITLE_BAR_HEIGHT } };
}

/**
 * Recolours the Windows / Linux window buttons and the window background when the theme changes.
 * `colors` come from the chosen colour theme (validated as #rrggbb); without them, the base theme's.
 */
export function applyWindowTheme(
  window: BrowserWindow,
  theme: WindowTheme,
  colors?: { surface: string; symbol: string },
): void {
  const overlay =
    colors === undefined ? OVERLAY_COLORS[theme] : { color: colors.surface, symbolColor: colors.symbol };
  window.setBackgroundColor(overlay.color);
  if (process.platform === "darwin") return;
  window.setTitleBarOverlay({ ...overlay, height: TITLE_BAR_HEIGHT });
}
