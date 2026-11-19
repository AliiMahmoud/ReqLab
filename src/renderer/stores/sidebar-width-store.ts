import { signal } from "./signal";

const STORAGE_KEY = "reqlab.sidebarWidth";
export const DEFAULT_SIDEBAR_WIDTH = 272;
/** Fits the full search field and the "+" button beside it (12 + 159 + 8 + 34 + 12 px, rounded up). */
const MIN_WIDTH = 228;
const MAX_WIDTH = 600;

/** The left panel's width in px. A display preference, kept in this window's local storage. */
export const sidebarWidth = signal(readSavedWidth());

export function setSidebarWidth(width: number): void {
  const clamped = clampWidth(width);
  if (clamped === sidebarWidth.get()) return;
  sidebarWidth.set(clamped);
  try {
    localStorage.setItem(STORAGE_KEY, String(clamped));
  } catch {
    // Storage blocked: the width lasts until the window closes.
  }
}

function clampWidth(width: number): number {
  return Number.isFinite(width)
    ? Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)))
    : DEFAULT_SIDEBAR_WIDTH;
}

function readSavedWidth(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? DEFAULT_SIDEBAR_WIDTH : clampWidth(Number(saved));
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

const HIDDEN_KEY = "reqlab.sidebarHidden";

/** The left panel can be hidden (bottom-left button); remembered like its width. */
export const isSidebarHidden = signal(readSavedHidden());

export function toggleSidebar(): void {
  isSidebarHidden.set(!isSidebarHidden.get());
  try {
    localStorage.setItem(HIDDEN_KEY, String(isSidebarHidden.get()));
  } catch {
    // Storage blocked: the choice lasts until the window closes.
  }
}

function readSavedHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "true";
  } catch {
    return false;
  }
}
