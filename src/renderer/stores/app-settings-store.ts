import { api } from "../api";
import { APP_FONTS, EDITOR_FONTS } from "./font-choices";
import { signal } from "./signal";

export { APP_FONTS, EDITOR_FONTS } from "./font-choices";

/** The whole interface's size, as a zoom factor (like the browser's zoom, so everything scales together). */
export const APP_SCALES = { "0.9": "Small", "1": "Default", "1.1": "Large", "1.25": "Larger" } as const;

/** Text size without zooming the layout: every font size scales from the default 13 px. */
export const FONT_SIZES = {
  "11": "11 px",
  "12": "12 px",
  "13": "13 px (default)",
  "14": "14 px",
  "15": "15 px",
  "16": "16 px",
  "18": "18 px",
} as const;
const DEFAULT_FONT_SIZE = 13;

/** How tall the rows of the requests tree and of the tables (params, headers, form fields) are. */
export const LINE_HEIGHTS = {
  compact: { label: "Compact", rowHeight: 24 },
  normal: { label: "Normal", rowHeight: 28 },
  relaxed: { label: "Relaxed", rowHeight: 34 },
} as const;

export interface AppSettings {
  appFont: keyof typeof APP_FONTS;
  appScale: keyof typeof APP_SCALES;
  fontSize: keyof typeof FONT_SIZES;
  lineHeight: keyof typeof LINE_HEIGHTS;
  /** Saved requests save themselves shortly after an edit. */
  autoSave: boolean;
  editorFont: keyof typeof EDITOR_FONTS;
  closeBrackets: boolean;
  closeQuotes: boolean;
  /** Body form-data / x-www-form values may span several lines (Enter adds a line). */
  multilineValues: boolean;
}

const DEFAULTS: AppSettings = {
  appFont: "system",
  appScale: "1",
  fontSize: "13",
  lineHeight: "normal",
  autoSave: false,
  editorFont: "system",
  closeBrackets: true,
  closeQuotes: true,
  multilineValues: false,
};
const STORAGE_KEY = "reqlab.appSettings";

/** App-wide display and editing preferences, kept in this window's local storage. */
export const appSettings = signal<AppSettings>(readSaved());

export function setAppSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  appSettings.set({ ...appSettings.get(), [key]: value });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appSettings.get()));
  } catch {
    // Storage blocked: the setting lasts until the window closes.
  }
  apply();
}

function apply(): void {
  const settings = appSettings.get();
  const root = document.documentElement.style;
  root.setProperty("--font-ui", APP_FONTS[settings.appFont].stack);
  root.setProperty("--font-code", EDITOR_FONTS[settings.editorFont].stack);
  root.setProperty("--text-scale", String(Number(settings.fontSize) / DEFAULT_FONT_SIZE));
  root.setProperty("--row-height", `${String(LINE_HEIGHTS[settings.lineHeight].rowHeight)}px`);
  void api.setWindowZoom({ factor: Number(settings.appScale) });
}

/** Unknown or missing values (an older or edited file) fall back to the defaults. */
function readSaved(): AppSettings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const saved =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Partial<Record<keyof AppSettings, unknown>>)
        : {};
    const pick = <K extends keyof AppSettings>(
      key: K,
      isValid: (value: unknown) => boolean,
    ): AppSettings[K] => (isValid(saved[key]) ? (saved[key] as AppSettings[K]) : DEFAULTS[key]);
    const isBoolean = (value: unknown): boolean => typeof value === "boolean";
    return {
      appFont: pick("appFont", (value) => typeof value === "string" && value in APP_FONTS),
      appScale: pick("appScale", (value) => typeof value === "string" && value in APP_SCALES),
      fontSize: pick("fontSize", (value) => typeof value === "string" && value in FONT_SIZES),
      lineHeight: pick("lineHeight", (value) => typeof value === "string" && value in LINE_HEIGHTS),
      autoSave: pick("autoSave", isBoolean),
      editorFont: pick("editorFont", (value) => typeof value === "string" && value in EDITOR_FONTS),
      closeBrackets: pick("closeBrackets", isBoolean),
      closeQuotes: pick("closeQuotes", isBoolean),
      multilineValues: pick("multilineValues", isBoolean),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

apply();
