import { css, html, LitElement, type TemplateResult } from "lit";
import type { AuthType, RequestAuth } from "@shared/models/auth";
import { AUTH_FIELDS, AUTH_TYPE_LABELS, createDefaultAuth, type AuthField } from "./auth-fields";
import { watch } from "../controllers/signal-watcher";
import { knownVariableNames } from "../stores/environment-store";
import { formStyles } from "./shared-styles";
import {
  hasVariables,
  syncVariableOverlay,
  variableFieldStyles,
  variableOverlay,
} from "./variable-highlight";
import "./oauth2-token-panel";
import "./ui-select";

const AUTH_TYPE_OPTIONS = AUTH_TYPE_LABELS.map(([value, label]) => ({ value, label }));

/**
 * Picks an auth type and edits its fields. Used by a request's Auth tab and by the
 * folder / collection auth dialog. Values may hold {{variables}}.
 */
export class AuthEditor extends LitElement {
  static override styles = [
    formStyles,
    variableFieldStyles,
    css`
      :host {
        display: block;
        container-type: inline-size;
        padding: var(--space-3);
      }
      /* Postman-style: the type and its explanation on the left, the values on the right. */
      .split {
        display: grid;
        grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
        gap: var(--space-4);
        align-items: start;
      }
      .type {
        display: grid;
        gap: var(--space-2);
        padding-right: var(--space-4);
        border-right: 1px solid var(--color-border-soft);
      }
      .fields {
        --variable-overlay-padding: 0 10px;
        --variable-overlay-border: 1px;
        display: grid;
        gap: var(--space-2);
        max-width: 640px;
      }
      .field {
        display: grid;
        grid-template-columns: minmax(110px, 160px) minmax(0, 1fr);
        gap: var(--space-3);
        align-items: center;
        color: var(--color-text-muted);
        font-size: calc(12px * var(--text-scale));
      }
      .field .variable-field input {
        width: 100%;
      }
      .field.is-multiline {
        align-items: start;
      }
      .empty {
        color: var(--color-text-faint);
        font-size: calc(12px * var(--text-scale));
        margin: var(--space-2) 0;
      }
      @container (max-width: 560px) {
        .split {
          grid-template-columns: minmax(0, 1fr);
        }
        .type {
          padding-right: 0;
          border-right: none;
        }
      }
      input,
      textarea {
        font-family: var(--font-code);
      }
      textarea {
        min-height: 72px;
        resize: vertical;
      }
    `,
  ];
  static override properties = {
    auth: { attribute: false },
    inheritHint: { attribute: false },
    collectionId: { attribute: false },
    onChange: { attribute: false },
  };

  declare auth: RequestAuth;
  /** What "inherit" means here, e.g. "the folder's or collection's auth". */
  /** Text, or a live element (the request's "Uses Bearer Token from …"). */
  declare inheritHint: string | TemplateResult;
  /** Where collection variables come from when the OAuth token is fetched. */
  declare collectionId: string | null;
  declare onChange: (auth: RequestAuth) => void;

  constructor() {
    super();
    this.inheritHint = "Uses the auth of the nearest folder or collection.";
    this.onChange = () => undefined;
    this.collectionId = null;
    watch(this, knownVariableNames);
  }

  override render(): TemplateResult {
    const fields = AUTH_FIELDS[this.auth.type].filter((field) => this.isShown(field));
    return html`<div class="split">
      <div class="type">
        <label>
          Auth Type
          <ui-select
            block
            .options=${AUTH_TYPE_OPTIONS}
            .value=${this.auth.type}
            .label=${"Authorization type"}
            .onChange=${this.changeType}
          ></ui-select>
        </label>
        ${this.renderHint()}
      </div>
      <div class="fields">
        ${
          fields.length === 0
            ? html`<p class="empty">This auth type has no settings.</p>`
            : fields.map((field) => this.renderField(field))
        }
        ${this.renderTokenPanel()}
      </div>
    </div>`;
  }

  private renderHint(): TemplateResult | undefined {
    if (this.auth.type === "inherit")
      return typeof this.inheritHint === "string"
        ? html`<p class="hint">${this.inheritHint}</p>`
        : this.inheritHint;
    if (this.auth.type === "none")
      return html`<p class="hint">No authentication is added to the request.</p>`;
    return html`<p class="hint">
      A header you set yourself in Headers takes precedence. {{variables}} work in every field.
    </p>`;
  }

  private renderTokenPanel(): TemplateResult | undefined {
    if (this.auth.type !== "oauth2") return undefined;
    return html`<oauth2-token-panel
      .auth=${this.auth}
      .collectionId=${this.collectionId}
    ></oauth2-token-panel>`;
  }

  private isShown(field: AuthField): boolean {
    if (field.showWhen === undefined) return true;
    const value = (this.auth as Record<string, unknown>)[field.showWhen.field];
    return typeof value === "string" && field.showWhen.values.includes(value);
  }

  private renderField(field: AuthField): TemplateResult {
    const stored = (this.auth as Record<string, unknown>)[field.name];
    const value = typeof stored === "string" ? stored : "";
    const set = (fieldValue: string): void => {
      const next: Record<string, unknown> = { ...this.auth, [field.name]: fieldValue };
      this.onChange(next as RequestAuth);
    };
    const update = (event: Event): void => {
      set((event.target as HTMLInputElement).value);
    };
    if (field.kind === "choice") return renderChoice(field, value, set);
    return renderTextField(field, value, update);
  }

  private readonly changeType = (type: string): void => {
    this.onChange(createDefaultAuth(type as AuthType));
  };
}

function renderChoice(field: AuthField, value: string, choose: (value: string) => void): TemplateResult {
  const options = (field.choices ?? []).map((choice) => ({
    value: choice,
    label: field.choiceLabels?.[choice] ?? choice,
  }));
  return html`<label class="field"
    >${field.label}
    <ui-select
      block
      .options=${options}
      .value=${value}
      .label=${field.label}
      .onChange=${choose}
    ></ui-select>
  </label>`;
}

function renderTextField(field: AuthField, value: string, update: (event: Event) => void): TemplateResult {
  const placeholder = field.placeholder ?? "";
  if (field.kind === "multiline") {
    return html`<label class="field is-multiline"
      >${field.label}
      <textarea spellcheck="false" placeholder=${placeholder} .value=${value} @input=${update}></textarea>
    </label>`;
  }
  const onInput = (event: Event): void => {
    update(event);
    syncVariableOverlay(event);
  };
  return html`<label class="field"
    >${field.label}
    <span class="variable-field">
      <input
        data-variables
        class=${hasVariables(value) ? "has-variables" : ""}
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder=${placeholder}
        .value=${value}
        @input=${onInput}
        @scroll=${syncVariableOverlay}
        @keyup=${syncVariableOverlay}
      />${variableOverlay(value)}
    </span>
  </label>`;
}

customElements.define("auth-editor", AuthEditor);

declare global {
  interface HTMLElementTagNameMap {
    "auth-editor": AuthEditor;
  }
}
