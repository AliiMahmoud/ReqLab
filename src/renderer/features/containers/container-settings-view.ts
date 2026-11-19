import { html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import type { RequestAuth } from "@shared/models/auth";
import type { VariableView } from "@shared/models/environment";
import type { ContainerSettings, Scripts } from "@shared/models/scripts";
import { api } from "../../api";
import "../../components/auth-editor";
import { collectionIcon, macFolderIcon } from "../../components/icons";
import "../../components/scripts-editor";
import { formStyles } from "../../components/shared-styles";
import { findTreeItem } from "../../stores/collection-store";
import { loadVariables, saveVariables } from "../../stores/environment-store";
import { callApi } from "../../stores/notice-store";
import type { ContainerSection, ContainerTabInfo, RequestTab } from "../../stores/request-tab";
import { updateTab } from "../../stores/tab-store";
import "../environments/variable-table";
import "./container-name";
import { containerSettingsStyles } from "./container-settings-styles";

const SAVE_DELAY_MS = 400;

const SECTIONS: { section: ContainerSection; label: string; collectionOnly?: boolean }[] = [
  { section: "auth", label: "Authorization" },
  { section: "variables", label: "Variables", collectionOnly: true },
  { section: "scripts", label: "Scripts" },
];

/**
 * A collection's or folder's settings, in a tab like Postman's: the auth requests inside inherit,
 * the collection's variables, and scripts. Every change saves itself shortly after.
 */
export class ContainerSettingsView extends LitElement {
  static override styles = [formStyles, containerSettingsStyles];
  static override properties = {
    workspaceId: { attribute: false },
    tab: { attribute: false },
    settings: { state: true },
    variables: { state: true },
    status: { state: true },
  };

  declare workspaceId: string;
  declare tab: RequestTab;
  declare settings: ContainerSettings | undefined;
  declare variables: VariableView[];
  declare status: string;
  #saveTimer: ReturnType<typeof setTimeout> | undefined;
  #pendingSave: (() => Promise<void>) | undefined;

  constructor() {
    super();
    this.variables = [];
    this.status = "";
  }

  private get container(): ContainerTabInfo {
    return this.tab.container as ContainerTabInfo;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    const previous = changed.get("tab")?.container?.id;
    if (!changed.has("tab") || previous === this.container.id) return;
    void this.flushSave();
    void this.load();
  }

  override disconnectedCallback(): void {
    void this.flushSave();
    super.disconnectedCallback();
  }

  override render(): TemplateResult {
    const { isCollection } = this.container;
    return html`<header>
        <span class="icon">${isCollection ? collectionIcon() : macFolderIcon()}</span>
        <container-name
          .workspaceId=${this.workspaceId}
          .entryId=${this.container.id}
          .name=${this.tab.name}
        ></container-name>
        <span class="status" role="status">${this.status}</span>
      </header>
      <div role="tablist" aria-label="Settings">
        ${this.visibleSections().map((entry) => this.renderTab(entry))}
      </div>
      <div class="body">${this.renderSection()}</div>`;
  }

  private visibleSections(): typeof SECTIONS {
    return SECTIONS.filter((entry) => entry.collectionOnly !== true || this.container.isCollection);
  }

  private renderTab(entry: (typeof SECTIONS)[number]): TemplateResult {
    const choose = (): void => {
      updateTab(this.tab.id, { container: { ...this.container, section: entry.section } });
    };
    const isSelected = this.container.section === entry.section;
    return html`<button role="tab" aria-selected=${String(isSelected)} @click=${choose}>
      ${entry.label}
    </button>`;
  }

  private renderSection(): TemplateResult | undefined {
    const settings = this.settings;
    if (settings === undefined) return undefined;
    if (this.container.section === "variables" && this.container.isCollection) return this.renderVariables();
    if (this.container.section === "scripts") return this.renderScripts(settings.scripts);
    return this.renderAuth(settings.auth);
  }

  private renderAuth(auth: RequestAuth): TemplateResult {
    const change = (next: RequestAuth): void => {
      this.change({ auth: next });
    };
    const hint = this.container.isCollection
      ? "A collection that inherits has no auth: requests inside are sent without auth."
      : "Uses the auth of the parent folder or the collection.";
    return html`<p class="hint">Every request inside that is set to "Inherit from parent" uses this.</p>
      <auth-editor
        .auth=${auth}
        .inheritHint=${hint}
        .collectionId=${this.collectionId()}
        .onChange=${change}
      ></auth-editor>`;
  }

  private renderVariables(): TemplateResult {
    const change = (variables: VariableView[]): void => {
      this.variables = variables;
      this.scheduleSave(() => this.saveVariables());
    };
    return html`<p class="hint">
        Used by every request in this collection as {{name}}; an active environment's variable of the same
        name wins.
      </p>
      <variable-table .variables=${this.variables} .onChange=${change}></variable-table>`;
  }

  private renderScripts(scripts: Scripts): TemplateResult {
    const change = (next: Scripts): void => {
      this.change({ scripts: next });
    };
    return html`<p class="hint">Run for every request inside, before the request's own scripts.</p>
      <scripts-editor .scripts=${scripts} .onChange=${change}></scripts-editor>`;
  }

  private change(change: Partial<ContainerSettings>): void {
    if (this.settings === undefined) return;
    this.settings = { ...this.settings, ...change };
    this.scheduleSave(() => this.saveSettings());
  }

  private collectionId(): string | null {
    const { id, isCollection } = this.container;
    return isCollection ? id : (findTreeItem(id)?.collectionId ?? null);
  }

  private async load(): Promise<void> {
    const { id, isCollection } = this.container;
    this.settings = undefined;
    this.status = "";
    const settings = await callApi(api.getContainerSettings({ workspaceId: this.workspaceId, id }));
    const owner = { scope: "collection" as const, id };
    const variables = isCollection ? ((await loadVariables(this.workspaceId, owner)) ?? []) : [];
    if (this.container.id !== id) return;
    this.settings = settings;
    this.variables = variables;
  }

  private scheduleSave(save: () => Promise<void>): void {
    clearTimeout(this.#saveTimer);
    this.#pendingSave = save;
    this.status = "Saving…";
    this.#saveTimer = setTimeout(() => void this.flushSave(), SAVE_DELAY_MS);
  }

  private async flushSave(): Promise<void> {
    clearTimeout(this.#saveTimer);
    const save = this.#pendingSave;
    this.#pendingSave = undefined;
    if (save !== undefined) await save();
  }

  /** Bound to this container now, so a save that runs after switching tabs still goes to the right one. */
  private saveSettings(): Promise<void> {
    const { workspaceId, settings } = this;
    const id = this.container.id;
    return this.saved(
      settings === undefined ? undefined : api.saveContainerSettings({ workspaceId, id, settings }),
    );
  }

  private saveVariables(): Promise<void> {
    const owner = { scope: "collection" as const, id: this.container.id };
    const variables = this.variables.filter((row) => row.key.trim() !== "");
    return this.saved(
      saveVariables(this.workspaceId, owner, variables).then((saved) => ({ ok: saved !== undefined })),
    );
  }

  private async saved(pending: Promise<{ ok: boolean }> | undefined): Promise<void> {
    if (pending === undefined) return;
    const result = await pending;
    this.status = result.ok ? "Saved" : "Not saved";
    // Requests that inherit (their "Uses … from" hint) read the new auth.
    window.dispatchEvent(new Event("reqlab:container-settings-saved"));
  }
}

customElements.define("container-settings-view", ContainerSettingsView);

declare global {
  interface HTMLElementTagNameMap {
    "container-settings-view": ContainerSettingsView;
  }
}
