import { api } from "../api";
import { APP_FONTS, EDITOR_FONTS } from "./font-choices";
import { signal } from "./signal";

export { APP_FONTS, EDITOR_FONTS } from "./font-choices";

/** The whole interface's size, as a zoom factor (like the browser's zoom, so everything scales together). */
export const APP_SCALES = { "0.9": "Small", "1": "Default", "1.1": "Large", "1.25": "Larger" } as const;

export interface AppSettings {
  appFont: keyof typeof APP_FONTS;
  appScale: keyof typeof APP_SCALES;
  /** Saved requests save themselves shortly after an edit. */
  autoSave: boolean;
  editorFont: keyof typeof EDITOR_FONTS;
  closeBrackets: boolean;
  closeQuotes: boolean;
}

const DEFAULTS: AppSettings = {
  appFont: "system",
  appScale: "1",
  autoSave: false,
  editorFont: "system",
  closeBrackets: true,
  closeQuotes: true,
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
      autoSave: pick("autoSave", isBoolean),
      editorFont: pick("editorFont", (value) => typeof value === "string" && value in EDITOR_FONTS),
      closeBrackets: pick("closeBrackets", isBoolean),
      closeQuotes: pick("closeQuotes", isBoolean),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

apply();
