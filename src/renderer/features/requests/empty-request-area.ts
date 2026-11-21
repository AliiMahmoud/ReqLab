import { css, html, LitElement, type TemplateResult } from "lit";
import { logoIcon } from "../../components/icons";
import { shortcutKeys } from "../../components/shortcut-label";
import { formStyles } from "../../components/shared-styles";
import { openDraft } from "../../stores/tab-store";

/** The same keys as the application menu (main/menu/application-menu.ts). */
const SHORTCUTS: [label: string, keys: string][] = [
  ["New request", "Mod+N"],
  ["Send request", "Mod+Enter"],
  ["Save request", "Mod+S"],
  ["Search requests", "Mod+K"],
  ["Close tab", "Mod+W"],
  ["Reopen closed tab", "Mod+Shift+T"],
  ["Beautify body", "Mod+B"],
  ["Show / hide response", "Mod+Shift+R"],
];

/** Shown when no request is open: the logo in the middle and the main shortcuts under it. */
export class EmptyRequestArea extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        margin: auto;
        display: grid;
        justify-items: center;
        gap: 28px;
        padding: 32px 16px;
      }
      .brand {
        display: grid;
        justify-items: center;
        gap: 10px;
        opacity: 0.9;
      }
      .brand .mark {
        display: grid;
        place-items: center;
        width: 76px;
        height: 76px;
        border-radius: 20px;
        background: var(--color-surface);
        border: 1px solid var(--color-border-soft);
      }
      .brand strong {
        font-size: calc(18px * var(--text-scale));
        letter-spacing: 0.01em;
        color: var(--color-text);
      }
      /* Two columns of "label ……… keys", one column on a narrow window. */
      ul {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 12px 48px;
        margin: 0;
        padding: 0;
        list-style: none;
        font-size: calc(12.5px * var(--text-scale));
      }
      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        color: var(--color-text-muted);
      }
      .keys {
        display: flex;
        gap: 4px;
      }
      @media (max-width: 760px) {
        ul {
          grid-template-columns: minmax(220px, 1fr);
        }
      }
      kbd {
        min-width: 22px;
        padding: 2px 6px;
        border: 1px solid var(--color-border);
        border-bottom-width: 2px;
        border-radius: 5px;
        background: var(--color-raised);
        color: var(--color-text-soft);
        font-family: var(--font-code);
        font-size: calc(11.5px * var(--text-scale));
        text-align: center;
      }
    `,
  ];

  override render(): TemplateResult {
    return html`
      <div class="brand">
        <span class="mark">${logoIcon(40)}</span>
        <strong>ReqLab</strong>
      </div>
      <ul aria-label="Keyboard shortcuts">
        ${SHORTCUTS.map(
          ([label, keys]) =>
            html`<li>
              <span>${label}</span>
              <span class="keys">${shortcutKeys(keys).map((key) => html`<kbd>${key}</kbd>`)}</span>
            </li>`,
        )}
      </ul>
      <button
        class="primary"
        @click=${() => {
          openDraft();
        }}
      >
        New request
      </button>
    `;
  }
}

customElements.define("empty-request-area", EmptyRequestArea);

declare global {
  interface HTMLElementTagNameMap {
    "empty-request-area": EmptyRequestArea;
  }
}
