import { css, html, LitElement, type TemplateResult } from "lit";
import { closeIcon } from "./icons";
import { renderScriptDocs } from "./script-docs-content";
import { formStyles } from "./shared-styles";
import { showModal } from "./modal-dialog";
import { clearDocsHighlight, filterDocs } from "./script-docs-search";

/** The scripts' "?" button and the reference window it opens (the pm API, assertions, examples). */
export class ScriptDocs extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        display: inline-flex;
        /* Off the panel's right edge. */
        margin-right: 12px;
      }
      .help {
        width: 28px;
        height: 28px;
        padding: 0;
        border-radius: 50%;
        font-weight: 600;
        color: var(--color-text-muted);
      }
      dialog {
        width: min(760px, calc(100% - 48px));
        max-height: min(720px, calc(100% - 64px));
        padding: 0;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-large);
        background: var(--color-surface);
        color: var(--color-text);
        box-shadow: var(--shadow-popup);
      }
      dialog[open] {
        display: flex;
        flex-direction: column;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 45%);
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        border-bottom: 1px solid var(--color-border);
      }
      header strong {
        flex: 1;
        font-size: calc(15px * var(--text-scale));
      }
      .search {
        width: min(260px, 40%);
        margin-right: var(--space-2);
        padding: 5px 10px;
        font-size: calc(12.5px * var(--text-scale));
      }
      .search:focus-visible {
        outline: none;
        border-color: var(--color-accent);
      }
      [hidden] {
        display: none !important;
      }
      ::highlight(script-docs-search) {
        background-color: var(--editor-find-match);
        color: inherit;
      }
      .no-matches {
        margin: 18px 0;
        color: var(--color-text-muted);
      }
      .close {
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        background: transparent;
      }
      .content {
        outline: none;
        overflow: auto;
        padding: 4px 20px 20px;
        font-size: calc(12.5px * var(--text-scale));
        line-height: 1.6;
      }
      h3 {
        margin: 18px 0 6px;
        font-size: calc(11px * var(--text-scale));
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--color-text-muted);
      }
      .notes {
        margin: 0;
        padding-left: 18px;
      }
      dl {
        display: grid;
        grid-template-columns: minmax(220px, max-content) 1fr;
        gap: 4px 16px;
        margin: 0;
      }
      dd {
        margin: 0;
        color: var(--color-text-muted);
      }
      code,
      pre {
        font-family: var(--font-code);
        font-size: calc(12px * var(--text-scale));
      }
      dt code {
        color: var(--syntax-key);
      }
      .words code {
        display: inline-block;
        margin: 2px 0;
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--color-selected);
      }
      .example-title {
        margin: 12px 0 4px;
        font-weight: 600;
      }
      pre {
        margin: 0;
        padding: 10px 12px;
        overflow-x: auto;
        border: 1px solid var(--color-border-soft);
        border-radius: var(--radius-small);
        background: var(--color-sunken);
        white-space: pre;
      }
    `,
  ];

  override render(): TemplateResult {
    return html`<button
        class="help"
        aria-label="Scripts help"
        title="Scripts help: the pm API"
        @click=${this.open}
      >
        ?
      </button>
      <dialog aria-label="Scripts help" @keydown=${this.focusSearch} @close=${clearDocsHighlight}>
        <header>
          <strong>Scripts: the pm API</strong>
          <input
            class="search"
            type="search"
            aria-label="Search the scripts help"
            placeholder="Search, e.g. cookies, environment, expect"
            spellcheck="false"
            @input=${this.search}
          />
          <button class="close" aria-label="Close help" title="Close" @click=${this.close}>
            ${closeIcon()}
          </button>
        </header>
        <div class="content" tabindex="-1" autofocus>
          <p class="no-matches" hidden>No matches.</p>
          ${renderScriptDocs()}
        </div>
      </dialog>`;
  }

  /** Shows only what matches, highlighted; Cmd/Ctrl+F in the window jumps to the field. */
  private readonly search = (event: Event): void => {
    const content = this.renderRoot.querySelector<HTMLElement>(".content");
    const noMatches = this.renderRoot.querySelector<HTMLElement>(".no-matches");
    if (content === null || noMatches === null) return;
    const isAnyShown = filterDocs(content, (event.target as HTMLInputElement).value);
    noMatches.hidden = isAnyShown;
  };

  private readonly focusSearch = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== "f" || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    this.renderRoot.querySelector<HTMLInputElement>(".search")?.select();
  };

  private readonly open = (): void => {
    // Focus starts on the text (autofocus): arrow keys scroll it, and no ring lands on the close button.
    showModal(this.renderRoot.querySelector("dialog"));
  };

  private readonly close = (): void => {
    this.renderRoot.querySelector("dialog")?.close();
  };
}

customElements.define("script-docs", ScriptDocs);

declare global {
  interface HTMLElementTagNameMap {
    "script-docs": ScriptDocs;
  }
}
