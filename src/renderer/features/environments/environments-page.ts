import { html, LitElement, type TemplateResult } from "lit";
import { safeStyle } from "../../directives/safe-style";
import type { VariableOwner, VariableView } from "@shared/models/environment";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { collectionTree } from "../../stores/collection-store";
import {
  activeEnvironmentId,
  createEnvironment,
  deleteEnvironment,
  duplicateEnvironment,
  environments,
  loadVariables,
  renameEnvironment,
  saveVariables,
} from "../../stores/environment-store";
import { askToConfirm } from "../../stores/confirm-store";
import { signal } from "../../stores/signal";
import { environmentsStyles } from "./environments-styles";
import { COLLECTION_DOT, GLOBALS_DOT, ownerKey } from "./variable-owner-choice";
import { renderVariableCards } from "./variable-cards";
import "./variable-table";
import { shortName } from "../../components/short-name";
import { environmentsFocus } from "../../stores/view-store";
import { focusVariableRow } from "./focus-variable";
import { colorTagPickerStyles } from "./color-tag-picker";
import { renderEnvironmentActions } from "./environment-actions";
import { DebouncedSave } from "./debounced-save";
import { environmentDot, NO_COLOR } from "./environment-colors";

const SAVE_STATE_LABELS = { "": "", saving: "Saving…", saved: "All changes saved" } as const;

/** Settings › Environments: globals, environments and collection variables, one table at a time. */
export class EnvironmentsPage extends LitElement {
  static override styles = [formStyles, environmentsStyles, colorTagPickerStyles];
  static override properties = { workspaceId: { attribute: false } };

  declare workspaceId: string;
  readonly #owner = signal<VariableOwner>({ scope: "global" });
  readonly #variables = signal<VariableView[]>([]);
  /** "saving" while an edit is being written, "saved" after; "" before any edit. */
  readonly #saveState = signal<"" | "saving" | "saved">("");
  readonly #autoSave = new DebouncedSave();
  #stopWatchingFocus: (() => void) | undefined;
  readonly #template = signal("{{baseUrl}}/v1");

  constructor() {
    super();
    watch(
      this,
      environments,
      activeEnvironmentId,
      collectionTree,
      this.#owner,
      this.#variables,
      this.#saveState,
      this.#template,
    );
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // A "go to" from a {{variable}} wins over the default (the active environment, else globals).
    this.#stopWatchingFocus = environmentsFocus.subscribe(() => void this.showFocusedVariable());
    if (environmentsFocus.get() !== undefined) {
      void this.showFocusedVariable();
      return;
    }
    const active = activeEnvironmentId.get();
    void this.select(active === null ? { scope: "global" } : { scope: "environment", id: active });
  }

  override disconnectedCallback(): void {
    this.#stopWatchingFocus?.();
    void this.#autoSave.flush();
    super.disconnectedCallback();
  }

  private async showFocusedVariable(): Promise<void> {
    const focus = environmentsFocus.get();
    if (focus === undefined) return;
    environmentsFocus.set(undefined);
    await this.select(focus.owner);
    await focusVariableRow(this, focus.key);
  }

  override render(): TemplateResult {
    return html`
      <aside aria-label="Variable sets">
        <div class="group">Environments</div>
        ${environments
          .get()
          .map((environment) =>
            this.renderOwner(
              { scope: "environment", id: environment.id },
              environment.name,
              environmentDot(environment),
            ),
          )}
        <button class="new" @click=${this.newEnvironment}>+ New environment</button>
        <div class="group">Shared</div>
        ${this.renderOwner({ scope: "global" }, "Globals", GLOBALS_DOT)}
        ${collectionTree
          .get()
          .collections.map((collection) =>
            this.renderOwner({ scope: "collection", id: collection.id }, collection.name, COLLECTION_DOT),
          )}
        <p class="note">Values are saved in this workspace's encrypted file on disk.</p>
      </aside>
      <main>${this.renderHeader()} ${this.renderTable()} ${this.renderCards()}</main>
    `;
  }

  private renderOwner(owner: VariableOwner, name: string, color: string): TemplateResult {
    const isCurrent = ownerKey(owner) === ownerKey(this.#owner.get());
    const isActive = owner.scope === "environment" && owner.id === activeEnvironmentId.get();
    return html`<button class="owner" aria-current=${String(isCurrent)} @click=${() => this.select(owner)}>
      <span
        class="dot ${color === NO_COLOR ? "is-empty" : ""}"
        style=${safeStyle({ background: color === NO_COLOR ? undefined : color })}
        aria-hidden="true"
      ></span>
      <span class="name">${name}</span>
      ${isActive ? html`<span class="active-mark">active</span>` : undefined}
    </button>`;
  }

  private renderHeader(): TemplateResult {
    const owner = this.#owner.get();
    const subtitle = {
      global: "Visible to every request",
      collection: "Collection variables",
      environment: "Environment",
    };
    return html`<div class="title-row">
      <div>
        <h1>
          ${
            owner.scope === "environment"
              ? html`<input
                  aria-label="Environment name"
                  .value=${this.ownerName()}
                  maxlength="200"
                  @change=${this.rename}
                />`
              : this.ownerName()
          }
        </h1>
        <div class="subtitle">${subtitle[owner.scope]}</div>
      </div>
      ${owner.scope === "environment" ? this.renderEnvironmentActions(owner.id) : undefined}
    </div>`;
  }

  private renderEnvironmentActions(environmentId: string): TemplateResult {
    return renderEnvironmentActions({
      workspaceId: this.workspaceId,
      environment: environments.get().find((candidate) => candidate.id === environmentId),
      duplicate: () => this.duplicate(environmentId),
      delete: () => this.deleteEnvironment(environmentId),
    });
  }

  /** Edits save themselves shortly after typing stops; a small line says so. */
  private renderTable(): TemplateResult {
    const state = this.#saveState.get();
    const edit = (variables: VariableView[]): void => {
      this.#variables.set(variables);
      this.#saveState.set("saving");
      const owner = this.#owner.get();
      this.#autoSave.schedule(() => this.save(owner));
    };
    return html`
      <variable-table .variables=${this.#variables.get()} .onChange=${edit}></variable-table>
      <p class="save-state" role="status">${SAVE_STATE_LABELS[state]}</p>
    `;
  }

  private renderCards(): TemplateResult {
    return renderVariableCards({
      template: this.#template.get(),
      variables: this.#variables.get(),
      setTemplate: (template) => {
        this.#template.set(template);
      },
    });
  }

  private ownerName(): string {
    const owner = this.#owner.get();
    if (owner.scope === "global") return "Globals";
    const list = owner.scope === "environment" ? environments.get() : collectionTree.get().collections;
    return list.find((entry) => entry.id === owner.id)?.name ?? "";
  }

  private async select(owner: VariableOwner): Promise<void> {
    await this.#autoSave.flush();
    const variables = await loadVariables(this.workspaceId, owner);
    if (variables === undefined) return;
    this.#owner.set(owner);
    this.#variables.set(variables);
    this.#saveState.set("");
  }

  /** Saves the rows that have a name; the table keeps what is being typed (e.g. a blank new row). */
  private async save(owner: VariableOwner): Promise<void> {
    const rows = this.#variables.get().filter((variable) => variable.key.trim() !== "");
    const saved = await saveVariables(this.workspaceId, owner, rows);
    if (saved === undefined || ownerKey(owner) !== ownerKey(this.#owner.get())) return;
    this.#saveState.set("saved");
  }

  private readonly newEnvironment = async (): Promise<void> => {
    const created = await createEnvironment(
      this.workspaceId,
      `Environment ${String(environments.get().length + 1)}`,
    );
    if (created !== undefined) await this.select({ scope: "environment", id: created.id });
  };

  private readonly rename = async (event: Event): Promise<void> => {
    const owner = this.#owner.get();
    const name = (event.target as HTMLInputElement).value.trim();
    if (owner.scope === "environment" && name !== "")
      await renameEnvironment(this.workspaceId, owner.id, name);
  };

  private async duplicate(environmentId: string): Promise<void> {
    const copy = await duplicateEnvironment(this.workspaceId, environmentId);
    if (copy !== undefined) await this.select({ scope: "environment", id: copy.id });
  }

  private async deleteEnvironment(environmentId: string): Promise<void> {
    const confirmed = await askToConfirm({
      kind: "delete-environment",
      title: `Delete the environment "${shortName(this.ownerName())}"?`,
      message: "Its variables are deleted too.",
      confirmLabel: "Delete",
      isDanger: true,
    });
    if (!confirmed) return;
    await deleteEnvironment(this.workspaceId, environmentId);
    await this.select({ scope: "global" });
  }
}

customElements.define("environments-page", EnvironmentsPage);

declare global {
  interface HTMLElementTagNameMap {
    "environments-page": EnvironmentsPage;
  }
}
