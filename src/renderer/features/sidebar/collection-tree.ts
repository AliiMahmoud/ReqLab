import { html, LitElement, type TemplateResult } from "lit";
import { thinScrollbarStyles } from "../../components/thin-scrollbar";
import { safeStyle } from "../../directives/safe-style";
import type { Collection, TreeItem } from "@shared/models/collection";
import {
  chevronDownIcon,
  chevronRightIcon,
  folderIcon,
  macFolderIcon,
  plusIcon,
  settingsIcon,
} from "../../components/icons";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import {
  childrenOf,
  collapsedIds,
  collectionTree,
  createItem,
  deleteTreeEntry,
  renameTreeEntry,
  toggleCollapsed,
} from "../../stores/collection-store";
import { signal } from "../../stores/signal";
import { activeTabId, getActiveTab, openSavedRequest, reconcileTabsWithTree } from "../../stores/tab-store";
import { treeSearch } from "../../stores/view-store";
import { findVisibleIds } from "./tree-filter";
import { dragCollection, TreeDropController } from "./tree-drop";
import { installTreeKeys, renameKeys } from "./tree-keys";
import { selectedClass, treeSelection } from "./tree-selection";
import type { ContextMenu } from "../../components/context-menu";
import "../../components/context-menu";
import { TreeRowMenus } from "./tree-menu";
import { confirmTreeDelete, indent, renderMethodBadge, dragItem, type ContainerRow } from "./tree-rows";
import { openContainerSettings } from "../containers/open-container-settings";
import { TreeRevealController } from "./tree-reveal";
import { rowButtonStyles, treeStyles } from "./tree-styles";

/** Set by the sidebar's "New collection" so the new row opens in rename mode. */
export const renamingId = signal<string | undefined>(undefined);

/** Collections, folders and requests. Drag a request or folder onto a collection or folder to move it. */
export class CollectionTree extends LitElement {
  static override styles = [thinScrollbarStyles, formStyles, treeStyles, rowButtonStyles];
  static override properties = { workspaceId: { attribute: false } };

  declare workspaceId: string;
  #visibleIds: ReadonlySet<string> | undefined;
  readonly #drops = new TreeDropController(this, () => this.workspaceId);
  readonly #menus = new TreeRowMenus({
    workspaceId: () => this.workspaceId,
    menu: () => this.menu(),
    addItem: (row, kind) => this.addItem(row.collectionId, row.folderId, kind),
    openSettings: (row) => {
      this.openSettings(row);
    },
    rename: (id) => {
      renamingId.set(id);
    },
    delete: (entry) => this.deleteEntry(entry),
  });

  constructor() {
    super();
    installTreeKeys(this, () => this.workspaceId);
    // Registers itself with the tree: the open request's row is shown and scrolled to.
    new TreeRevealController(this);
    watch(this, collectionTree, collapsedIds, treeSearch, renamingId, activeTabId, treeSelection);
  }

  override render(): TemplateResult {
    const { collections } = collectionTree.get();
    this.#visibleIds = findVisibleIds(collectionTree.get(), treeSearch.get());
    if (collections.length === 0) {
      return html`<p class="empty">
        No collections yet. Use + to create one, then add folders and requests.
      </p>`;
    }
    const shown = collections.filter((collection) => this.isVisible(collection.id));
    if (shown.length === 0) return html`<p class="empty">Nothing matches "${treeSearch.get()}".</p>`;
    return html`<nav aria-label="Collections">
        ${shown.map((collection) => this.renderCollection(collection))}
      </nav>
      <context-menu></context-menu>`;
  }

  private renderCollection(collection: Collection): TemplateResult {
    return html`
      ${this.renderContainerRow({ ...collection, collectionId: collection.id, folderId: null, depth: 0 })}
      ${this.isExpanded(collection.id) ? this.renderChildren(collection.id, null, 1) : undefined}
    `;
  }

  private renderChildren(collectionId: string, parentId: string | null, depth: number): TemplateResult[] {
    return childrenOf(collectionId, parentId)
      .filter((item) => this.isVisible(item.id))
      .map((item) =>
        item.kind === "folder"
          ? html`${this.renderContainerRow({ ...item, folderId: item.id, depth })}
            ${this.isExpanded(item.id) ? this.renderChildren(collectionId, item.id, depth + 1) : undefined}`
          : this.renderRequestRow(item, depth),
      );
  }

  private renderContainerRow(row: ContainerRow): TemplateResult {
    const drop = this.#drops.handlersFor(row);
    return html`<div
      class="row is-container ${selectedClass(row.id)} ${this.#drops.classFor(row.id)}"
      style=${safeStyle({ paddingLeft: indent(row.depth) })}
      draggable="true"
      @dragstart=${row.folderId === null ? dragCollection(row.id) : dragItem(row.folderId)}
      @dragover=${drop.dragover}
      @dragleave=${drop.dragleave}
      @drop=${drop.drop}
      @contextmenu=${this.#menus.forContainer(row)}
    >
      ${this.renderName(row, this.renderContainerLabel(row))} ${this.renderContainerActions(row)}
    </div>`;
  }

  private renderContainerLabel(row: ContainerRow): TemplateResult {
    const isOpen = this.isExpanded(row.id);
    const toggle = (): void => {
      toggleCollapsed(row.id);
    };
    return html`<button
      class="row-main"
      aria-expanded=${String(isOpen)}
      data-entry-id=${row.id}
      data-entry-name=${row.name}
      @click=${toggle}
    >
      ${isOpen ? chevronDownIcon() : chevronRightIcon()}
      ${row.folderId === null ? undefined : macFolderIcon()}
      <span class="name" title=${row.name}>${row.name}</span>
    </button>`;
  }

  /** On hover: new request, new folder and settings; everything else is in the right-click menu. */
  private renderContainerActions(row: ContainerRow): TemplateResult {
    const add = (kind: TreeItem["kind"]) => (): Promise<void> =>
      this.addItem(row.collectionId, row.folderId, kind);
    return html`<span class="actions">
      <button aria-label="New request in ${row.name}" title="New request" @click=${add("request")}>
        ${plusIcon()}
      </button>
      <button aria-label="New folder in ${row.name}" title="New folder" @click=${add("folder")}>
        ${folderIcon()}
      </button>
      <button
        aria-label="Settings of ${row.name}"
        title="Settings"
        @click=${() => {
          this.openSettings(row);
        }}
      >
        ${settingsIcon(14)}
      </button>
    </span>`;
  }

  private renderRequestRow(item: TreeItem, depth: number): TemplateResult {
    const drop = this.#drops.handlersFor({
      id: item.id,
      collectionId: item.collectionId,
      folderId: undefined,
    });
    return html`<div
      class="row ${getActiveTab()?.itemId === item.id ? "is-active" : ""} ${selectedClass(item.id)} ${this.#drops.classFor(item.id)}"
      style=${safeStyle({ paddingLeft: indent(depth) })}
      draggable="true"
      @dragstart=${dragItem(item.id)}
      @dragover=${drop.dragover}
      @dragleave=${drop.dragleave}
      @drop=${drop.drop}
      @contextmenu=${this.#menus.forRequest(item)}
    >
      ${this.renderName(
        item,
        html`<button
          class="row-main is-request"
          data-entry-id=${item.id}
          data-entry-name=${item.name}
          @click=${() => openSavedRequest(this.workspaceId, item.id)}
        >
          ${renderMethodBadge(item.method ?? "GET")}
          <span class="name" title=${item.name}>${item.name}</span>
        </button>`,
      )}
    </div>`;
  }

  /** The row's label, or a text field while it is being renamed. */
  private renderName(entry: { id: string; name: string }, label: TemplateResult): TemplateResult {
    if (renamingId.get() !== entry.id) return label;
    return html`<input
      class="rename"
      aria-label="New name"
      .value=${entry.name}
      maxlength="200"
      @keydown=${renameKeys(() => {
        renamingId.set(undefined);
      })}
      @blur=${(event: FocusEvent) => this.commitRename(entry.id, event.target as HTMLInputElement)}
    />`;
  }

  protected override updated(): void {
    const input = this.renderRoot.querySelector<HTMLInputElement>("input.rename");
    if (input !== null && !input.matches(":focus")) {
      input.focus();
      input.select();
    }
  }

  private isVisible(id: string): boolean {
    return this.#visibleIds?.has(id) ?? true;
  }

  private isExpanded(id: string): boolean {
    return this.#visibleIds !== undefined || !collapsedIds.get().has(id);
  }

  private openSettings(row: ContainerRow): void {
    openContainerSettings({ id: row.id, name: row.name, isCollection: row.folderId === null });
  }

  private async addItem(
    collectionId: string,
    parentId: string | null,
    kind: TreeItem["kind"],
  ): Promise<void> {
    if (collapsedIds.get().has(parentId ?? collectionId)) toggleCollapsed(parentId ?? collectionId);
    const name = kind === "folder" ? "New folder" : "New request";
    const created = await createItem(this.workspaceId, { collectionId, parentId, kind, name });
    if (created === undefined) return;
    if (kind === "request") await openSavedRequest(this.workspaceId, created.id);
    renamingId.set(created.id);
  }

  private readonly menu = (): ContextMenu | null =>
    this.renderRoot.querySelector<ContextMenu>("context-menu");

  private async deleteEntry(entry: { id: string; name: string }): Promise<void> {
    if (!(await confirmTreeDelete(entry.name))) return;
    await deleteTreeEntry(this.workspaceId, entry.id);
    reconcileTabsWithTree();
  }

  private async commitRename(id: string, input: HTMLInputElement): Promise<void> {
    if (renamingId.get() !== id) return;
    renamingId.set(undefined);
    const name = input.value.trim();
    if (name === "" || name === input.defaultValue) return;
    await renameTreeEntry(this.workspaceId, id, name);
    reconcileTabsWithTree();
  }
}

customElements.define("collection-tree", CollectionTree);

declare global {
  interface HTMLElementTagNameMap {
    "collection-tree": CollectionTree;
  }
}
