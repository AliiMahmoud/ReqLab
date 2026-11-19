import { css, html, LitElement, type TemplateResult } from "lit";
import { shortName } from "../../components/short-name";
import type { WorkspaceSummary } from "@shared/models/workspace";
import { MAX_WORKSPACE_NAME_LENGTH } from "@shared/limits";
import { formStyles, readField } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import {
  createWorkspace,
  deleteWorkspace,
  errorMessage,
  isBusy,
  renameWorkspace,
} from "../../stores/workspace-store";

export type WorkspaceDialogKind = "create" | "rename" | "delete";

/**
 * New, rename and delete, as modal dialogs. A new workspace needs only a name: its key is
 * protected by the OS keychain.
 */
export class WorkspaceDialogs extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        display: contents;
      }
      dialog {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-large);
        background: var(--color-surface);
        color: var(--color-text);
        width: min(420px, calc(100% - 32px));
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 55%);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
      }
    `,
  ];
  static override properties = { workspace: { attribute: false }, kind: { state: true } };

  declare workspace: WorkspaceSummary;
  declare kind: WorkspaceDialogKind | undefined;

  constructor() {
    super();
    watch(this, isBusy, errorMessage);
  }

  async open(kind: WorkspaceDialogKind): Promise<void> {
    errorMessage.set(undefined);
    this.kind = kind;
    await this.updateComplete;
    this.renderRoot.querySelector("form")?.reset();
    this.renderRoot.querySelector("dialog")?.showModal();
  }

  override render(): TemplateResult {
    return html`<dialog @close=${this.forget}>${this.renderForm()}</dialog>`;
  }

  private renderForm(): TemplateResult | undefined {
    if (this.kind === "create") return this.renderCreateForm();
    if (this.kind === "rename") return this.renderRenameForm();
    if (this.kind === "delete") return this.renderDeleteForm();
    return undefined;
  }

  private renderCreateForm(): TemplateResult {
    return html`<form @submit=${this.submitCreate}>
      <strong>New workspace</strong>
      <label>Name ${this.renderNameInput("")}</label>
      <p class="hint">Encrypted on this computer and unlocked with your system keychain.</p>
      ${this.renderFooter("Create workspace")}
    </form>`;
  }

  private renderRenameForm(): TemplateResult {
    return html`<form @submit=${this.submitRename}>
      <strong>Rename workspace</strong>
      <label>Name ${this.renderNameInput(this.workspace.name)}</label>
      ${this.renderFooter("Rename")}
    </form>`;
  }

  private renderDeleteForm(): TemplateResult {
    return html`<form @submit=${this.submitDelete}>
      <strong>Delete ${shortName(this.workspace.name)}?</strong>
      <p class="hint">Deletes the workspace with all its collections, environments and history.</p>
      ${this.renderFooter("Delete forever", "danger")}
    </form>`;
  }

  private renderNameInput(value: string): TemplateResult {
    return html`<input
      name="name"
      required
      autocomplete="off"
      maxlength=${MAX_WORKSPACE_NAME_LENGTH}
      .defaultValue=${value}
    />`;
  }

  private renderFooter(submitLabel: string, tone = ""): TemplateResult {
    return html`<p class="error" role="alert">${errorMessage.get() ?? ""}</p>
      <div class="actions">
        <button type="button" @click=${this.close}>Cancel</button>
        <button class="primary ${tone}" ?disabled=${isBusy.get()}>${submitLabel}</button>
      </div>`;
  }

  private readonly close = (): void => {
    this.renderRoot.querySelector("dialog")?.close();
  };

  private readonly forget = (): void => {
    this.kind = undefined;
  };

  private readonly submitCreate = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const name = readField(event.currentTarget as HTMLFormElement, "name").trim();
    if (await createWorkspace(name, undefined)) this.close();
  };

  private readonly submitRename = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const name = readField(event.currentTarget as HTMLFormElement, "name").trim();
    if (await renameWorkspace(this.workspace.id, name)) this.close();
  };

  private readonly submitDelete = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    // Main still checks the name; the dialog itself (Cancel focused first) is the confirmation.
    if (await deleteWorkspace(this.workspace.id, this.workspace.name)) this.close();
  };
}

customElements.define("workspace-dialogs", WorkspaceDialogs);

declare global {
  interface HTMLElementTagNameMap {
    "workspace-dialogs": WorkspaceDialogs;
  }
}
