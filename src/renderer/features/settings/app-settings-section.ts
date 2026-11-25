import { html, type TemplateResult } from "lit";
import type { SelectOption } from "../../components/ui-select";
import "../../components/ui-select";
import {
  APP_FONTS,
  APP_SCALES,
  appSettings,
  EDITOR_FONTS,
  FONT_SIZES,
  LINE_HEIGHTS,
  RESPONSE_POSITIONS,
  setAppSetting,
  type AppSettings,
} from "../../stores/app-settings-store";
import { isFontInstalled } from "../../stores/font-choices";

const options = (entries: Record<string, string>): SelectOption[] =>
  Object.entries(entries).map(([value, label]) => ({ value, label }));

/** Only fonts installed on this computer (the CSP blocks downloading any); the chosen one stays listed. */
function fontOptions(
  fonts: Record<string, { label: string; family: string }>,
  chosen: string,
): SelectOption[] {
  return Object.entries(fonts)
    .filter(([value, font]) => value === chosen || isFontInstalled(font.family))
    .map(([value, font]) => ({ value, label: font.label }));
}

/** App font, font size, line height and app size (Settings › Theme). */
export function renderAppearanceRows(): TemplateResult {
  const settings = appSettings.get();
  return html`${selectRow("App font", "The fonts installed on this computer.", { key: "appFont", value: settings.appFont, options: fontOptions(APP_FONTS, settings.appFont) })}
  ${selectRow("Font size", "The text everywhere, without zooming the layout.", { key: "fontSize", value: settings.fontSize, options: options(FONT_SIZES) })}
  ${selectRow("Line height", "How tall the rows of the requests list and of the tables are.", { key: "lineHeight", value: settings.lineHeight, options: lineHeightOptions() })}
  ${selectRow("Response position", "Below the request, or beside it to see both at once.", { key: "responsePosition", value: settings.responsePosition, options: options(RESPONSE_POSITIONS) })}
  ${selectRow("App size", "Zooms the whole window: text, spacing and controls.", { key: "appScale", value: settings.appScale, options: options(APP_SCALES) })}`;
}

function lineHeightOptions(): SelectOption[] {
  return Object.entries(LINE_HEIGHTS).map(([value, entry]) => ({ value, label: entry.label }));
}

/** Auto-save, then the Editor group: its font and auto-closing. */
export function renderEditingRows(): TemplateResult {
  const settings = appSettings.get();
  return html`<h3 class="group">Editing</h3>
    ${toggleRow("Auto-save", "Saved requests save themselves shortly after a change.", "autoSave")}
    ${toggleRow("New lines in form values", "Body form-data and x-www-form values can span lines: Enter adds one.", "multilineValues")}
    <h3 class="group">Editor</h3>
    ${selectRow("Editor font", "For the code editors and URL.", { key: "editorFont", value: settings.editorFont, options: fontOptions(EDITOR_FONTS, settings.editorFont) })}
    ${toggleRow("Auto-close brackets", "Typing ( [ { also types ) ] }.", "closeBrackets")}
    ${toggleRow("Auto-close quotes", "Typing a quote also types its closing quote.", "closeQuotes")}`;
}

function selectRow(
  label: string,
  hint: string,
  field: {
    key: "appFont" | "appScale" | "fontSize" | "lineHeight" | "responsePosition" | "editorFont";
    value: string;
    options: SelectOption[];
  },
): TemplateResult {
  const choose = (value: string): void => {
    setAppSetting(field.key, value as AppSettings[typeof field.key]);
  };
  return html`<div class="setting">
    <div>
      <div class="title">${label}</div>
      <p class="hint">${hint}</p>
    </div>
    <ui-select
      .options=${field.options}
      .value=${field.value}
      .label=${label}
      .onChange=${choose}
    ></ui-select>
  </div>`;
}

function toggleRow(
  label: string,
  hint: string,
  key: "autoSave" | "closeBrackets" | "closeQuotes" | "multilineValues",
): TemplateResult {
  const change = (event: Event): void => {
    setAppSetting(key, (event.target as HTMLInputElement).checked);
  };
  return html`<div class="setting">
    <div>
      <div class="title">${label}</div>
      <p class="hint">${hint}</p>
    </div>
    <input
      class="switch"
      type="checkbox"
      role="switch"
      aria-label=${label}
      .checked=${appSettings.get()[key]}
      @change=${change}
    />
  </div>`;
}
