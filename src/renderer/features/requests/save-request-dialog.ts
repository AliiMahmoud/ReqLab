import { html, LitElement, type TemplateResult } from "lit";
import { dialogStyles } from "../../components/dialog-styles";
import { chevronRightIcon, macFolderIcon, plusIcon } from "../../components/icons";
import { methodColor } from "../../components/method-colors";
import { formStyles, readField } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { safeStyle } from "../../directives/safe-style";
import {
  collectionTree,
  createCollection,
  createItem,
  loadCollectionTree,
} from "../../stores/collection-store";
import { findTab, saveDraftAs } from "../../stores/tab-store";
import {
  ALL_COLLECTIONS,
  breadcrumbOf,
  entriesAt,
  locationName,
  searchEntries,
  stillExists,
  type Entry,
  type SaveLocation,
} from "./save-location";
import { saveRequestDialogStyles } from "./save-request-dialog-styles";
import { showModal } from "../../components/modal-dialog";

/** Remembered between saves, like Postman: the next save starts where the last one went. */
let lastLocation: SaveLocation = ALL_COLLECTIONS;

/**
 * Saving a draft, Postman-style: a name, then browse collections and folders (breadcrumb, search,
 * new collection or folder on the spot) and "Save to <place>".
 */
export class SaveRequestDialog extends LitElement {
  static override styles = [formStyles, dialogStyles, saveRequestDialogStyles];
  static override properties = {
    workspaceId: { attribute: false },
    location: { state: true },
    search: { state: true },
    isCreating: { state: true },
  };

  declare workspaceId: string;
  declare location: SaveLocation;
  declare search: string;
  /** True while the "New collection" / "New folder" name field is shown. */
  declare isCreating: boolean;
  #tabId: string | undefined;
  #defaultName = "";
  #finish: (saved: boolean) => void = () => undefined;

  constructor() {
    super();
    this.location = ALL_COLLECTIONS;
    this.search = "";
    this.isCreating = false;
    watch(this, collectionTree);
  }

  /** Resolves true once the request is saved, false if the dialog is closed without saving. */
  open(tabId: string, defaultName: string): Promise<boolean> {
    this.#finish(false);
    const outcome = new Promise<boolean>((resolve) => {
      this.#finish = (saved) => {
        this.#finish = () => undefined;
        resolve(saved);
      };
    });
    this.#tabId = tabId;
    this.#defaultName = defaultName;
    this.location = stillExists(lastLocation) ? lastLocation : ALL_COLLECTIONS;
    this.search = "";
    this.isCreating = false;
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector("form")?.reset();
      showModal(this.renderRoot.querySelector("dialog"));
      this.renderRoot.querySelector<HTMLInputElement>("input[name=name]")?.select();
    });
    return outcome;
  }

  override render(): TemplateResult {
    const target = locationName(this.location);
    return html`<dialog
      @close=${() => {
        this.#finish(false);
      }}
    >
      <form @submit=${this.submit}>
        <header>Save request</header>
        <div class="body">
          <label
            >Request name <input name="name" required maxlength="200" .defaultValue=${this.#defaultName}
          /></label>
          ${this.renderBreadcrumb()} ${this.renderBrowser()}
        </div>
        <footer>
          ${this.renderNewButton()}
          <span class="spacer"></span>
          <button type="button" @click=${this.close}>Cancel</button>
          <button
            class="primary"
            ?disabled=${target === undefined}
            title=${target ?? "Choose a collection or folder"}
          >
            ${target === undefined ? "Save" : `Save to ${target}`}
          </button>
        </footer>
      </form>
    </dialog>`;
  }

  private renderBreadcrumb(): TemplateResult {
    const crumbs = breadcrumbOf(this.location);
    return html`<nav class="save-to" aria-label="Save to">
      Save to
      ${crumbs.map(
        (crumb, index) =>
          html`${index === 0 ? undefined : html`<span class="separator">›</span>`}
            <button
              type="button"
              class="crumb"
              @click=${() => {
                this.goTo(crumb.location);
              }}
            >
              ${crumb.label}
            </button>`,
      )}
    </nav>`;
  }

  private renderBrowser(): TemplateResult {
    const isSearching = this.search.trim() !== "";
    const entries = isSearching ? searchEntries(this.search) : entriesAt(this.location);
    const updateSearch = (event: Event): void => {
      this.search = (event.target as HTMLInputElement).value;
    };
    return html`<div class="browser">
      <input
        class="search"
        type="search"
        aria-label="Search collections and folders"
        placeholder="Search for collection or folder"
        .value=${this.search}
        @input=${updateSearch}
      />
      <ul aria-label="Collections and folders">
        ${this.isCreating ? this.renderNewRow() : undefined}
        ${entries.length === 0 && !this.isCreating ? html`<li class="empty">${this.emptyText(isSearching)}</li>` : undefined}
        ${entries.map((entry) => this.renderEntry(entry))}
      </ul>
    </div>`;
  }

  private emptyText(isSearching: boolean): string {
    if (isSearching) return `Nothing matches "${this.search.trim()}".`;
    if (this.location.collectionId === null) return "No collections yet. Create one below.";
    return "This is empty. Save here, or create a folder below.";
  }

  private renderEntry(entry: Entry): TemplateResult {
    if (entry.location === undefined) {
      const method = (entry.method ?? "GET").toUpperCase();
      return html`<li class="request">
        <span class="method" style=${safeStyle({ color: methodColor(method) })}>${method}</span>
        <span class="name">${entry.name}</span>
      </li>`;
    }
    const location = entry.location;
    return html`<li class=${entry.kind}>
      <button
        type="button"
        @click=${() => {
          this.goTo(location);
        }}
      >
        <span class="kind-icon"
          >${entry.kind === "collection" ? entry.name.slice(0, 1).toUpperCase() : macFolderIcon(18)}</span
        >
        <span class="name"
          >${entry.name}${entry.path === undefined ? undefined : html` <span class="path">in ${entry.path}</span>`}</span
        >
        <span class="chevron">${chevronRightIcon()}</span>
      </button>
    </li>`;
  }

  private renderNewRow(): TemplateResult {
    const isCollection = this.location.collectionId === null;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        void this.createHere((event.target as HTMLInputElement).value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.isCreating = false;
      }
    };
    return html`<li class="new">
      <span class="kind-icon">${isCollection ? plusIcon() : macFolderIcon(18)}</span>
      <input
        aria-label=${isCollection ? "New collection name" : "New folder name"}
        maxlength="200"
        placeholder=${isCollection ? "Collection name, then Enter" : "Folder name, then Enter"}
        @keydown=${onKey}
      />
    </li>`;
  }

  private renderNewButton(): TemplateResult {
    const label = this.location.collectionId === null ? "New collection" : "New folder";
    const start = (): void => {
      this.search = "";
      this.isCreating = true;
      void this.updateComplete.then(() =>
        this.renderRoot.querySelector<HTMLInputElement>("li.new input")?.focus(),
      );
    };
    return html`<button type="button" class="link" @click=${start}>+ ${label}</button>`;
  }

  private goTo(location: SaveLocation): void {
    this.location = location;
    this.search = "";
    this.isCreating = false;
  }

  /** Creates a collection (top level) or a folder (inside), then opens it. */
  private async createHere(text: string): Promise<void> {
    const name = text.trim();
    if (name === "") return;
    const { collectionId, folderId } = this.location;
    if (collectionId === null) {
      const created = await createCollection(this.workspaceId, name);
      if (created !== undefined) this.goTo({ collectionId: created.id, folderId: null });
      return;
    }
    const created = await createItem(this.workspaceId, {
      collectionId,
      parentId: folderId,
      kind: "folder",
      name,
    });
    if (created !== undefined) this.goTo({ collectionId, folderId: created.id });
  }

  private readonly close = (): void => {
    this.renderRoot.querySelector("dialog")?.close();
  };

  private readonly submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const name = readField(event.currentTarget as HTMLFormElement, "name").trim();
    const { collectionId, folderId } = this.location;
    if (this.#tabId === undefined || collectionId === null || name === "") return;
    lastLocation = this.location;
    const tabId = this.#tabId;
    const finish = this.#finish;
    this.#finish = () => undefined; // closing below must not report "not saved"
    this.close();
    await saveDraftAs(this.workspaceId, tabId, { collectionId, parentId: folderId, name });
    await loadCollectionTree(this.workspaceId);
    finish(findTab(tabId)?.itemId !== null);
  };
}

customElements.define("save-request-dialog", SaveRequestDialog);

declare global {
  interface HTMLElementTagNameMap {
    "save-request-dialog": SaveRequestDialog;
  }
}
