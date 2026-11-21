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
import { appSettings } from "../stores/app-settings-store";
import { knownVariableNames } from "../stores/environment-store";
import { watch } from "../controllers/signal-watcher";

type Field = "key" | "value" | "description";

/**
 * Key / Value / Description rows like Postman's tables (params, headers, form fields), with a
 * blank last row for adding and a Bulk Edit mode ("key:value" per line, "//" disables a row).
 */
export class KeyValueTable extends LitElement {
  static override styles = [formStyles, keyValueTableStyles, variableFieldStyles];
  static override properties = {
    rows: { attribute: false },
    keyLabel: { attribute: false },
    title: { attribute: false },
    onChange: { attribute: false },
    allowsNewLines: { attribute: false },
    bulkText: { state: true },
  };

  declare rows: KeyValue[];
  declare keyLabel: string;
  declare title: string;
  declare onChange: (rows: KeyValue[]) => void;
  /** Body form tables: values may span lines when Settings › New lines in form values is on. */
  declare allowsNewLines: boolean;
  /** The bulk-edit text as typed; undefined while editing as a table. */
  declare bulkText: string | undefined;

  constructor() {
    super();
    this.rows = [];
    this.keyLabel = "Key";
    this.title = "";
    this.onChange = () => undefined;
    this.allowsNewLines = false;
    this.bulkText = undefined;
    watch(this, knownVariableNames, appSettings);
  }

  override render(): TemplateResult {
    const isBulk = this.bulkText !== undefined;
    return html`
      <div class="bar">
        <span>${this.title}</span><span class="spacer"></span>
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

  private renderTable(): TemplateResult {
    const blank: KeyValue = { key: "", value: "", isEnabled: true };
    return html`<div class="table" role="table" aria-label=${this.title || "Rows"}>
      <div class="row head" role="row">
        <span role="columnheader"></span><span role="columnheader">${this.keyLabel}</span>
        <span role="columnheader">Value</span><span role="columnheader">Description</span><span></span>
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
      ${this.renderCell(row, index, "description")}
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
      this.change(index, { [field]: (event.target as HTMLInputElement).value });
      syncVariableOverlay(event);
    };
    const value = row[field] ?? "";
    const highlights = field !== "description";
    if (this.spansLines(field)) {
      return renderLinesCell({ value, label: labels[field], isBlank: index === this.rows.length }, update);
    }
    return html`<span class="variable-field"
      ><input
        class="cell ${highlights && hasVariables(value) ? "has-variables" : ""}"
        data-variables
        aria-label=${labels[field]}
        placeholder=${index === this.rows.length ? labels[field] : ""}
        spellcheck="false"
        .value=${value}
        @input=${update}
        @scroll=${syncVariableOverlay}
        @keyup=${syncVariableOverlay}
        @select=${syncVariableOverlay}
      />${highlights ? variableOverlay(value) : undefined}</span
    >`;
  }

  /** Values of body form tables, when Settings › New lines in form values is on. */
  private spansLines(field: Field): boolean {
    return field === "value" && this.allowsNewLines && appSettings.get().multilineValues;
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

/** A value that may span lines: a text box that grows with its content; Enter adds a line. */
function renderLinesCell(
  cell: { value: string; label: string; isBlank: boolean },
  update: (event: Event) => void,
): TemplateResult {
  return html`<span class="variable-field is-multiline">
    <textarea
      class="cell ${hasVariables(cell.value) ? "has-variables" : ""}"
      rows="1"
      aria-label=${cell.label}
      placeholder=${cell.isBlank ? cell.label : ""}
      spellcheck="false"
      .value=${cell.value}
      @input=${update}
    ></textarea
    >${variableOverlay(cell.value)}</span
  >`;
}

customElements.define("key-value-table", KeyValueTable);

declare global {
  interface HTMLElementTagNameMap {
    "key-value-table": KeyValueTable;
  }
}
