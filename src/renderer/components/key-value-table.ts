import { html, LitElement, type TemplateResult } from "lit";
import type { KeyValue } from "@shared/models/request";
import { fromBulkText, toBulkText } from "./bulk-edit";
import "./code-area";
import { trashIcon } from "./icons";
import { keyValueTableStyles } from "./key-value-table-styles";
import { formStyles } from "./shared-styles";
import { shortcutLabel } from "./shortcut-label";
import {
  hasVariables,
  syncVariableOverlay,
  variableFieldStyles,
  variableOverlay,
} from "./variable-highlight";
import { appSettings, setAppSetting } from "../stores/app-settings-store";
import { knownVariableNames } from "../stores/environment-store";
import { headerNames } from "../stores/header-names-store";
import { suggestionList } from "./suggestion-list";
import { renderWrappingField, wrappingFieldStyles } from "./wrapping-field";
import { watch } from "../controllers/signal-watcher";

type Field = "key" | "value" | "description";

/**
 * Key / Value / Description rows like Postman's tables (params, headers, form fields), with a
 * blank last row for adding and a Bulk Edit mode ("key:value" per line, "//" disables a row).
 */
export class KeyValueTable extends LitElement {
  static override styles = [formStyles, keyValueTableStyles, variableFieldStyles, wrappingFieldStyles];
  static override properties = {
    rows: { attribute: false },
    keyLabel: { attribute: false },
    title: { attribute: false },
    onChange: { attribute: false },
    allowsNewLines: { attribute: false },
    suggestsHeaderNames: { attribute: false },
    bulkText: { state: true },
  };

  declare rows: KeyValue[];
  declare keyLabel: string;
  declare title: string;
  declare onChange: (rows: KeyValue[]) => void;
  /** Body form tables: values may span lines when Settings › New lines in form values is on. */
  declare allowsNewLines: boolean;
  /** The headers table: typing a name suggests known HTTP headers and saved requests' names. */
  declare suggestsHeaderNames: boolean;
  /** The bulk-edit text as typed; undefined while editing as a table. */
  declare bulkText: string | undefined;

  constructor() {
    super();
    this.rows = [];
    this.keyLabel = "Key";
    this.title = "";
    this.onChange = () => undefined;
    this.allowsNewLines = false;
    this.suggestsHeaderNames = false;
    this.bulkText = undefined;
    watch(this, knownVariableNames, appSettings, headerNames);
  }

  override render(): TemplateResult {
    const isBulk = this.bulkText !== undefined;
    return html`
      <div class="bar">
        <span>${this.title}</span><span class="spacer"></span>
        ${isBulk ? undefined : this.renderDescriptionToggle()}
        <button
          class="link"
          title=${`One key:value per line; // disables a line (${shortcutLabel("Mod+/")} toggles it)`}
          @click=${this.toggleBulk}
        >
          ${isBulk ? "Key-Value Edit" : "Bulk Edit"}
        </button>
      </div>
      ${isBulk ? this.renderBulk(this.bulkText ?? "") : this.renderTable()}
    `;
  }

  /** Shows or hides the Description column, in every table (Settings keeps the choice). */
  private renderDescriptionToggle(): TemplateResult {
    const isShown = appSettings.get().showDescriptions;
    const toggle = (): void => {
      setAppSetting("showDescriptions", !isShown);
    };
    return html`<button
      class="link"
      aria-pressed=${String(isShown)}
      title=${isShown ? "Hide the Description column" : "Show the Description column"}
      @click=${toggle}
    >
      ${isShown ? "Hide description" : "Show Description"}
    </button>`;
  }

  private renderTable(): TemplateResult {
    const blank: KeyValue = { key: "", value: "", isEnabled: true };
    const showsDescription = appSettings.get().showDescriptions;
    return html`<div
      class="table ${showsDescription ? "" : "is-without-description"}"
      role="table"
      aria-label=${this.title || "Rows"}
    >
      <div class="row head" role="row">
        <span role="columnheader"></span><span role="columnheader">${this.keyLabel}</span>
        <span role="columnheader">Value</span
        >${showsDescription ? html`<span role="columnheader">Description</span>` : undefined}<span></span>
      </div>
      ${[...this.rows, blank].map((row, index) => this.renderRow(row, index))}
    </div>`;
  }

  private renderRow(row: KeyValue, index: number): TemplateResult {
    const isBlank = index === this.rows.length;
    const toggle = (event: Event): void => {
      this.change(index, { isEnabled: (event.target as HTMLInputElement).checked });
    };
    const remove = (): void => {
      this.onChange(this.rows.filter((_row, rowIndex) => rowIndex !== index));
    };
    return html`<div class="row ${row.isEnabled ? "" : "is-off"}" role="row">
      <span class="check"
        >${isBlank ? undefined : html`<input type="checkbox" aria-label="Enabled" .checked=${row.isEnabled} @change=${toggle} />`}</span
      >
      ${this.renderCell(row, index, "key")} ${this.renderCell(row, index, "value")}
      ${appSettings.get().showDescriptions ? this.renderCell(row, index, "description") : undefined}
      <span class="actions">
        ${
          isBlank
            ? undefined
            : html`<button
                class="remove"
                aria-label="Delete ${row.key || "row"}"
                title="Delete"
                @click=${remove}
              >
                ${trashIcon(17)}
              </button>`
        }
      </span>
    </div>`;
  }

  private renderCell(row: KeyValue, index: number, field: Field): TemplateResult {
    const labels: Record<Field, string> = { key: this.keyLabel, value: "Value", description: "Description" };
    const update = (event: Event): void => {
      const input = event.target as HTMLInputElement;
      this.change(index, { [field]: input.value });
      syncVariableOverlay(event);
      if (field === "key" && this.suggestsHeaderNames) this.suggestNames(input, index);
    };
    const value = row[field] ?? "";
    const highlights = field !== "description";
    if (field === "value") return this.renderValueCell(value, index);
    return html`<span class="variable-field"
      ><input
        class="cell ${highlights && hasVariables(value) ? "has-variables" : ""}"
        data-variables
        aria-label=${labels[field]}
        placeholder=${index === this.rows.length ? labels[field] : ""}
        autocomplete="off"
        spellcheck="false"
        .value=${value}
        @input=${update}
        @keydown=${this.onNameCell(field, this.handleSuggestionKeys)}
        @blur=${this.onNameCell(field, this.hideSuggestions)}
        @scroll=${syncVariableOverlay}
        @keyup=${syncVariableOverlay}
        @select=${syncVariableOverlay}
      />${highlights ? variableOverlay(value) : undefined}</span
    >`;
  }

  /** Header names matching what is typed, under the name cell; a pick fills the cell. */
  private suggestNames(input: HTMLInputElement, index: number): void {
    const onPick = (name: string): void => {
      input.value = name;
      this.change(index, { key: name });
    };
    suggestionList().showFor(input, { typed: input.value, choices: headerNames.get(), onPick });
  }

  /** A handler for the name cells only (where header names are suggested). */
  private onNameCell<T>(field: Field, handler: T): T | undefined {
    return field === "key" ? handler : undefined;
  }

  private readonly handleSuggestionKeys = (event: KeyboardEvent): void => {
    if (suggestionList().handleKey(event.key)) event.preventDefault();
  };

  private readonly hideSuggestions = (): void => {
    suggestionList().hide();
  };

  /** Values wrap and grow instead of scrolling sideways; line breaks only where they are allowed. */
  private renderValueCell(value: string, index: number): TemplateResult {
    const placeholder = index === this.rows.length ? "Value" : "";
    const cell = {
      value,
      label: "Value",
      placeholder,
      className: "cell",
      allowsNewLines: this.allowsLineBreaks(),
    };
    return renderWrappingField(cell, (next) => {
      this.change(index, { value: next });
    });
  }

  /** Values of body form tables, when Settings › New lines in form values is on. */
  private allowsLineBreaks(): boolean {
    return this.allowsNewLines && appSettings.get().multilineValues;
  }

  private renderBulk(text: string): TemplateResult {
    const update = (next: string): void => {
      this.bulkText = next;
      this.onChange(fromBulkText(next, this.rows));
    };
    return html`<code-area
      .value=${text}
      .label=${`${this.title || "Rows"} (bulk edit)`}
      .placeholder=${`${this.keyLabel.toLowerCase()}:value`}
      .lineComment=${"//"}
      .onChange=${update}
    ></code-area>`;
  }

  private change(index: number, change: Partial<KeyValue>): void {
    const rows = [...this.rows];
    rows[index] = { ...(rows[index] ?? { key: "", value: "", isEnabled: true }), ...change };
    this.onChange(rows);
  }

  private readonly toggleBulk = (): void => {
    this.bulkText = this.bulkText === undefined ? toBulkText(this.rows) : undefined;
  };
}

customElements.define("key-value-table", KeyValueTable);

declare global {
  interface HTMLElementTagNameMap {
    "key-value-table": KeyValueTable;
  }
}
