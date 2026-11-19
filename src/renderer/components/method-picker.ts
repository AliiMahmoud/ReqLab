import { css, html, LitElement, type TemplateResult } from "lit";
import { StandardMethods } from "@shared/request-defaults";
import { methodColor } from "./method-colors";
import "./ui-select";

/** The HTTP method dropdown at the start of the URL bar: each method in its own colour. */
export class MethodPicker extends LitElement {
  static override styles = css`
    :host {
      display: flex;
    }
    ui-select {
      display: flex;
    }
    ui-select::part(trigger) {
      min-width: 108px;
      padding: 0 12px 0 14px;
      border: none;
      border-right: 1px solid var(--color-field-border);
      border-radius: var(--radius-large) 0 0 var(--radius-large);
      background: transparent;
      font-family: var(--font-ui);
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
    ui-select::part(trigger):hover {
      background: var(--color-field);
    }
    ui-select::part(option) {
      font-family: var(--font-ui);
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
  `;
  static override properties = { value: { attribute: false }, onChange: { attribute: false } };

  declare value: string;
  declare onChange: (method: string) => void;

  constructor() {
    super();
    this.value = "GET";
    this.onChange = () => undefined;
  }

  override render(): TemplateResult {
    const current = this.value.toUpperCase();
    // The standard verbs, plus the current one when it is non-standard (e.g. from an import).
    const methods = [...new Set<string>([...StandardMethods, current])];
    const options = methods.map((method) => ({ value: method, label: method, color: methodColor(method) }));
    return html`<ui-select
      .options=${options}
      .value=${current}
      .label=${"Method"}
      .onChange=${this.onChange}
    ></ui-select>`;
  }
}

customElements.define("method-picker", MethodPicker);

declare global {
  interface HTMLElementTagNameMap {
    "method-picker": MethodPicker;
  }
}
