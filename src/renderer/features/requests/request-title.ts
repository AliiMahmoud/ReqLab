import { css, html, LitElement, type TemplateResult } from "lit";
import { formStyles } from "../../components/shared-styles";
import { withShortcut } from "../../components/shortcut-label";
import { watch } from "../../controllers/signal-watcher";
import { collectionTree, findTreeItem, renameTreeEntry } from "../../stores/collection-store";
import { hasUnsavedChanges, type RequestTab } from "../../stores/request-tab";
import "./request-info";
import { reconcileTabsWithTree, updateTab } from "../../stores/tab-store";

/**
 * Above the URL bar, like Postman: where the request lives (collection / folders) and its name,
 * which renames the request when clicked. Save on the right.
 */
export class RequestTitle extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: 10px var(--space-4) 0;
        min-height: 34px;
        flex: none;
      }
      .path {
        color: var(--color-text-faint);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 45%;
      }
      /* A very long name is cut with "…" (full name on hover), so Save never leaves the row. */
      .name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 3px 6px;
        margin-left: -6px;
        border: 1px solid transparent;
        background: transparent;
        font-size: calc(14px * var(--text-scale));
        font-weight: 600;
        text-align: start;
        cursor: text;
      }
      .name:hover:not(:disabled) {
        background: transparent;
        border-color: var(--color-field-border);
      }
      input.rename {
        font-size: calc(14px * var(--text-scale));
        font-weight: 600;
        padding: 3px 6px;
        flex: 1;
        min-width: 260px;
      }
      .draft {
        color: var(--color-text-faint);
        font-size: calc(12px * var(--text-scale));
      }
      .spacer {
        flex: 1;
      }
      .save {
        padding: 5px 12px;
      }
    `,
  ];
  static override properties = {
    tab: { attribute: false },
    workspaceId: { attribute: false },
    isEditing: { state: true },
  };

  declare tab: RequestTab;
  declare workspaceId: string;
  declare isEditing: boolean;

  constructor() {
    super();
    this.isEditing = false;
    watch(this, collectionTree);
  }

  override render(): TemplateResult {
    const path = this.locationPath();
    return html`
      ${path === "" ? html`<span class="draft">Not saved yet ·</span>` : html`<span class="path" title=${path}>${path} /</span>`}
      ${this.isEditing ? this.renderInput() : html`<button class="name" title=${`${this.tab.name} (click to rename)`} @click=${this.startEditing}>${this.tab.name}</button>`}
      ${
        this.tab.itemId === null || this.isEditing
          ? undefined
          : html`<request-info .workspaceId=${this.workspaceId} .itemId=${this.tab.itemId}></request-info>`
      }
      ${this.isEditing ? undefined : html`<span class="spacer"></span>`}
      <button
        class="save"
        ?disabled=${!hasUnsavedChanges(this.tab)}
        title=${withShortcut("Save", "Mod+S")}
        @click=${this.save}
      >
        Save
      </button>
    `;
  }

  protected override updated(): void {
    const input = this.renderRoot.querySelector<HTMLInputElement>("input.rename");
    if (input !== null && !input.matches(":focus")) {
      input.focus();
      input.select();
    }
  }

  private renderInput(): TemplateResult {
    return html`<input
      class="rename"
      aria-label="Request name"
      maxlength="200"
      .value=${this.tab.name}
      @keydown=${this.handleKey}
      @blur=${this.commit}
    />`;
  }

  /** "Billing / Invoices" for a saved request; "" for a draft. */
  private locationPath(): string {
    const names: string[] = [];
    let item = findTreeItem(this.tab.itemId);
    const collectionId = item?.collectionId;
    for (
      item = findTreeItem(item?.parentId ?? null);
      item !== undefined;
      item = findTreeItem(item.parentId)
    ) {
      names.unshift(item.name);
    }
    const collection = collectionTree.get().collections.find((candidate) => candidate.id === collectionId);
    return collection === undefined ? "" : [collection.name, ...names].join(" / ");
  }

  private readonly startEditing = (): void => {
    this.isEditing = true;
  };

  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key === "Enter") (event.target as HTMLInputElement).blur();
    if (event.key !== "Escape") return;
    event.preventDefault();
    this.isEditing = false;
  };

  /** A saved request is renamed in its collection (tree and tab follow); a draft only renames its tab. */
  private readonly commit = async (event: FocusEvent): Promise<void> => {
    if (!this.isEditing) return;
    this.isEditing = false;
    const name = (event.target as HTMLInputElement).value.trim();
    if (name === "" || name === this.tab.name) return;
    if (this.tab.itemId === null) {
      updateTab(this.tab.id, { name });
      return;
    }
    await renameTreeEntry(this.workspaceId, this.tab.itemId, name);
    reconcileTabsWithTree();
  };

  private readonly save = (): void => {
    this.dispatchEvent(new CustomEvent("save-request", { bubbles: true, composed: true }));
  };
}

customElements.define("request-title", RequestTitle);

declare global {
  interface HTMLElementTagNameMap {
    "request-title": RequestTitle;
  }
}
