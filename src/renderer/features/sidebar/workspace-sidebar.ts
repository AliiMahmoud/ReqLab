import { css, html, LitElement, type TemplateResult } from "lit";
import { collectionIcon, importIcon, plusIcon, requestIcon } from "../../components/icons";
import { importCollections } from "../../stores/collection-transfer";
import { formStyles } from "../../components/shared-styles";
import { closeMenusOnOutsideClick } from "../../controllers/close-menus-on-outside-click";
import { watch } from "../../controllers/signal-watcher";
import { createCollection } from "../../stores/collection-store";
import { openDraft } from "../../stores/tab-store";
import { sidebarMode, treeSearch, type SidebarMode } from "../../stores/view-store";
import "./collection-tree";
import { renamingId } from "./collection-tree";
import "./history-list";
import { renderSidebarToggle, sidebarToggleStyles } from "./sidebar-toggle";
import { shortcutLabel } from "../../components/shortcut-label";

/** The window event the menu's Search (Cmd/Ctrl+K) arrives as. */
export const FOCUS_SEARCH_EVENT = "reqlab:focus-search";

/** Left column: search, the "new" menu, and Collections / History. */
export class WorkspaceSidebar extends LitElement {
  static override styles = [
    formStyles,
    sidebarToggleStyles,
    css`
      :host {
        /* The width (flex-basis) is set by the workspace from the draggable divider. */
        flex: 0 0 272px;
        min-width: 228px;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--color-border);
        background: var(--color-surface);
        min-height: 0;
      }
      .search {
        display: flex;
        gap: var(--space-2);
        padding: var(--space-3);
        position: relative;
      }
      .search label {
        flex: 1;
        display: flex;
        min-width: 0;
      }
      .search input {
        flex: 1;
        min-width: 0;
      }
      details > summary {
        list-style: none;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--color-field-border);
        border-radius: var(--radius);
        background: var(--color-field);
        cursor: pointer;
      }
      details > summary::-webkit-details-marker {
        display: none;
      }
      .menu {
        position: absolute;
        right: var(--space-3);
        top: 48px;
        z-index: 10;
        display: grid;
        min-width: 170px;
        padding: var(--space-1);
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        background: var(--color-surface);
      }
      .menu button {
        display: flex;
        align-items: center;
        gap: 8px;
        text-align: start;
        border: none;
        background: transparent;
      }
      .menu button svg {
        color: var(--color-text-muted);
      }
      .menu hr {
        margin: 4px 6px;
        border: none;
        border-top: 1px solid var(--color-border-soft);
      }
      .modes {
        display: flex;
        gap: var(--space-1);
        padding: 0 var(--space-3) var(--space-2);
      }
      .modes button {
        flex: 1;
        padding: 6px;
        border: none;
        background: transparent;
        color: var(--color-text-muted);
        font-size: 12px;
      }
      .modes button[aria-pressed="true"] {
        background: var(--color-selected);
        color: var(--color-text);
        font-weight: 500;
      }
      collection-tree,
      history-list {
        flex: 1;
        min-height: 0;
      }
    `,
  ];
  static override properties = { workspaceId: { attribute: false } };

  declare workspaceId: string;

  constructor() {
    super();
    watch(this, sidebarMode, treeSearch);
    closeMenusOnOutsideClick(this);
  }

  override render(): TemplateResult {
    const mode = sidebarMode.get();
    return html`
      <div class="search">
        <label>
          <span class="visually-hidden">Search ${mode}</span>
          <input
            type="search"
            placeholder=${`Search  ${shortcutLabel("Mod+K")}`}
            .value=${treeSearch.get()}
            @input=${updateSearch}
          />
        </label>
        ${this.renderNewMenu()}
      </div>
      <div class="modes" role="group" aria-label="Sidebar">
        ${this.renderModeButton("collections", "Collections")} ${this.renderModeButton("history", "History")}
      </div>
      ${
        mode === "collections"
          ? html`<collection-tree .workspaceId=${this.workspaceId}></collection-tree>`
          : html`<history-list .workspaceId=${this.workspaceId}></history-list>`
      }
      <div class="sidebar-footer">${renderSidebarToggle()}</div>
    `;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(FOCUS_SEARCH_EVENT, this.focusSearch);
  }

  override disconnectedCallback(): void {
    window.removeEventListener(FOCUS_SEARCH_EVENT, this.focusSearch);
    super.disconnectedCallback();
  }

  /** Cmd/Ctrl+K (application menu): jump to the search field and select what is there. */
  private readonly focusSearch = (): void => {
    const input = this.renderRoot.querySelector<HTMLInputElement>("input[type=search]");
    input?.focus();
    input?.select();
  };

  private renderNewMenu(): TemplateResult {
    return html`<details>
      <summary aria-label="New request, collection, or import" title="New or import">${plusIcon()}</summary>
      <div class="menu" @click=${this.closeMenu}>
        <button
          @click=${() => {
            openDraft();
          }}
        >
          ${requestIcon()} New request
        </button>
        <button @click=${this.newCollection}>${collectionIcon()} New collection</button>
        <hr />
        <button @click=${this.importCollection}>${importIcon()} Import collection…</button>
      </div>
    </details>`;
  }

  private renderModeButton(mode: SidebarMode, label: string): TemplateResult {
    return html`<button
      aria-pressed=${String(sidebarMode.get() === mode)}
      @click=${() => {
        sidebarMode.set(mode);
      }}
    >
      ${label}
    </button>`;
  }

  private readonly closeMenu = (): void => {
    this.renderRoot.querySelector("details")?.removeAttribute("open");
  };

  private readonly importCollection = (): void => {
    sidebarMode.set("collections");
    void importCollections(this.workspaceId);
  };

  private readonly newCollection = async (): Promise<void> => {
    sidebarMode.set("collections");
    const created = await createCollection(this.workspaceId, "New collection");
    if (created !== undefined) renamingId.set(created.id);
  };
}

function updateSearch(event: Event): void {
  treeSearch.set((event.target as HTMLInputElement).value);
}

customElements.define("workspace-sidebar", WorkspaceSidebar);

declare global {
  interface HTMLElementTagNameMap {
    "workspace-sidebar": WorkspaceSidebar;
  }
}
