import { css, html, LitElement, type TemplateResult } from "lit";
import type { VariableView } from "@shared/models/environment";
import { closeIcon } from "../../components/icons";
import { formStyles } from "../../components/shared-styles";

/** The variables of one owner: enabled, name, value. Values are shown as they are (no secret type). */
export class VariableTable extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        display: block;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-large);
        background: var(--color-surface);
        overflow-x: auto;
      }
      .grid {
        min-width: 640px;
      }
      .row {
        display: grid;
        grid-template-columns: 36px 1.1fr 2fr 40px;
        align-items: center;
        gap: var(--space-2);
        padding: 6px 12px;
        border-bottom: 1px solid var(--color-border-soft);
      }
      .head {
        padding: 10px 12px;
        border-bottom-color: var(--color-border);
        color: var(--color-text-faint);
        font-size: calc(11px * var(--text-scale));
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      input:not([type="checkbox"]) {
        font-family: var(--font-code);
        font-size: calc(12.5px * var(--text-scale));
        padding: 5px 8px;
        min-width: 0;
        background: transparent;
        border-color: transparent;
      }
      input:not([type="checkbox"]):hover,
      input:not([type="checkbox"]):focus,
      select:hover {
        border-color: var(--color-field-border);
        background: var(--color-field);
      }
      .key {
        color: var(--color-variable);
      }
      .remove {
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--color-text-faint);
      }
      .add {
        display: block;
        width: 100%;
        text-align: start;
        border: none;
        border-radius: 0;
        background: transparent;
        color: var(--color-text-muted);
        padding: 10px 12px;
      }
    `,
  ];
  static override properties = {
    variables: { attribute: false },
    onChange: { attribute: false },
  };

  declare variables: VariableView[];
  declare onChange: (variables: VariableView[]) => void;

  override render(): TemplateResult {
    return html`<div class="grid" role="table" aria-label="Variables">
      <div class="row head" role="row">
        <span role="columnheader"><span class="visually-hidden">Enabled</span></span>
        <span role="columnheader">Variable</span><span role="columnheader">Value</span><span></span>
      </div>
      ${this.variables.map((variable, index) => this.renderRow(variable, index))}
      <button class="add" @click=${this.addRow}>+ Add variable</button>
    </div>`;
  }

  private renderRow(variable: VariableView, index: number): TemplateResult {
    const change = (patch: Partial<VariableView>): void => {
      this.onChange(this.variables.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
    };
    const toggle = (event: Event): void => {
      change({ isEnabled: checked(event) });
    };
    const remove = (): void => {
      this.removeRow(index);
    };
    return html`<div class="row" role="row">
      <input type="checkbox" aria-label="Enabled" .checked=${variable.isEnabled} @change=${toggle} />
      ${renderCell({ isKey: true, value: variable.key }, (key) => {
        change({ key });
      })}
      ${renderCell({ isKey: false, value: variable.value }, (value) => {
        change({ value });
      })}
      <button class="remove" aria-label="Remove ${variable.key || "variable"}" @click=${remove}>
        ${closeIcon()}
      </button>
    </div>`;
  }

  private readonly addRow = (): void => {
    this.onChange([...this.variables, { key: "", value: "", isEnabled: true }]);
  };

  private removeRow(index: number): void {
    this.onChange(this.variables.filter((_row, rowIndex) => rowIndex !== index));
  }
}

/** The name (coloured as a variable) or the value of one row. */
function renderCell(
  cell: { isKey: boolean; value: string },
  update: (value: string) => void,
): TemplateResult {
  return html`<input
    class=${cell.isKey ? "key" : ""}
    aria-label=${cell.isKey ? "Variable name" : "Value"}
    placeholder=${cell.isKey ? "name" : ""}
    .value=${cell.value}
    @input=${(event: Event) => {
      update(text(event));
    }}
  />`;
}

function text(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function checked(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}

customElements.define("variable-table", VariableTable);

declare global {
  interface HTMLElementTagNameMap {
    "variable-table": VariableTable;
  }
}
