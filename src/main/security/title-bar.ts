import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";

/** The app header is the title bar; these must match its height and colours (renderer theme.css). */
export const TITLE_BAR_HEIGHT = 52;
const OVERLAY_COLORS = {
  light: { color: "#f4f5f7", symbolColor: "#545c69" },
  dark: { color: "#13161c", symbolColor: "#9aa3b2" },
} as const;
/** How much of the colour shows through a dialog's backdrop (renderer: rgb(0 0 0 / 55%)). */
const BACKDROP_SHOW_THROUGH = 0.45;

export type WindowTheme = keyof typeof OVERLAY_COLORS;
interface Overlay {
  color: string;
  symbolColor: string;
}

const themedOverlays = new WeakMap<BrowserWindow, Overlay>();
const windowsWithDialog = new WeakSet<BrowserWindow>();

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
  themedOverlays.set(window, overlay);
  window.setBackgroundColor(overlay.color);
  paintOverlay(window);
}

/**
 * While a dialog is open in the page, the window's own buttons (−, □, ×) are disabled and dimmed
 * like the rest of the page: they are drawn by the system, so the dialog's backdrop cannot cover them.
 */
export function setWindowModal(window: BrowserWindow, isOpen: boolean): void {
  if (isOpen) windowsWithDialog.add(window);
  else windowsWithDialog.delete(window);
  window.setMinimizable(!isOpen);
  window.setMaximizable(!isOpen);
  window.setClosable(!isOpen);
  paintOverlay(window);
}

function paintOverlay(window: BrowserWindow): void {
  if (process.platform === "darwin") return;
  const overlay = themedOverlays.get(window) ?? OVERLAY_COLORS.dark;
  const shown = windowsWithDialog.has(window) ? behindBackdrop(overlay) : overlay;
  window.setTitleBarOverlay({ ...shown, height: TITLE_BAR_HEIGHT });
}

function behindBackdrop(overlay: Overlay): Overlay {
  return { color: darken(overlay.color), symbolColor: darken(overlay.symbolColor) };
}

/** "#rrggbb" seen through the backdrop's black. */
function darken(hex: string): string {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const darker = channels.map((value) => Math.round(value * BACKDROP_SHOW_THROUGH));
  return `#${darker.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
