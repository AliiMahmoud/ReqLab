import { html, LitElement, type TemplateResult } from "lit";
import type { WorkspaceSummary } from "@shared/models/workspace";
import {
  checkIcon,
  chevronDownIcon,
  importIcon,
  lockIcon,
  plusIcon,
  saveFileIcon,
} from "../../components/icons";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { switchToWorkspace, workspaces } from "../../stores/workspace-store";
import type { WorkspaceDialogKind, WorkspaceDialogs } from "./workspace-dialogs";
import "./workspace-dialogs";
import type { ExportDialog } from "../interop/export-dialog";
import "../interop/export-dialog";
import type { ImportDialog } from "../interop/import-dialog";
import "../interop/import-dialog";
import { workspaceSwitcherStyles } from "./workspace-switcher-styles";

/**
 * The current workspace as a dropdown on the left of the header: switch to any workspace,
 * create, rename or delete. Beside it: Import and Export.
 */
export class WorkspaceSwitcher extends LitElement {
  static override styles = [formStyles, workspaceSwitcherStyles];
  static override properties = { workspace: { attribute: false }, isOpen: { state: true } };

  declare workspace: WorkspaceSummary;
  declare isOpen: boolean;

  constructor() {
    super();
    this.isOpen = false;
    watch(this, workspaces);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("pointerdown", this.closeOnOutsideClick);
  }

  override disconnectedCallback(): void {
    document.removeEventListener("pointerdown", this.closeOnOutsideClick);
    super.disconnectedCallback();
  }

  override render(): TemplateResult {
    return html`
      <button
        class="trigger"
        aria-haspopup="menu"
        aria-expanded=${String(this.isOpen)}
        title="Switch workspace"
        @click=${this.toggle}
        @keydown=${this.closeOnEscape}
      >
        <span class="name">${this.workspace.name}</span><span class="chevron">${chevronDownIcon()}</span>
      </button>
      ${this.isOpen ? this.renderPopup() : undefined}
      <workspace-dialogs .workspace=${this.workspace}></workspace-dialogs>
      <import-dialog></import-dialog>
      <export-dialog .workspace=${this.workspace}></export-dialog>
    `;
  }

  /** Import and Export, beside the "Workspaces" heading of the dropdown. */
  private renderWorkspaceActions(): TemplateResult {
    return html`
      <button
        class="icon heading-action"
        aria-label="Import workspace"
        title="Import workspace"
        @click=${this.startImport}
      >
        ${importIcon()}
      </button>
      <button
        class="icon heading-action"
        aria-label="Export ${this.workspace.name}"
        title="Export this workspace"
        @click=${this.startExport}
      >
        ${saveFileIcon()}
      </button>
    `;
  }

  private renderPopup(): TemplateResult {
    return html`<div class="popup" role="menu" aria-label="Workspaces" @keydown=${this.closeOnEscape}>
      <div class="group heading">
        <span>Workspaces</span><span class="heading-actions">${this.renderWorkspaceActions()}</span>
      </div>
      <div class="list">${workspaces.get().map((workspace) => this.renderWorkspace(workspace))}</div>
      <hr />
      <button class="item" role="menuitem" @click=${this.openDialog("create")}>
        <span class="mark">${plusIcon()}</span><span class="name">New workspace</span>
      </button>
      <hr />
      <button class="item" role="menuitem" @click=${this.openDialog("rename")}>
        <span class="mark"></span><span class="name">Rename workspace…</span>
      </button>
      <button class="item danger" role="menuitem" @click=${this.openDialog("delete")}>
        <span class="mark"></span><span class="name">Delete workspace…</span>
      </button>
    </div>`;
  }

  private renderWorkspace(workspace: WorkspaceSummary): TemplateResult {
    const isCurrent = workspace.id === this.workspace.id;
    const open = (): void => {
      this.isOpen = false;
      if (!isCurrent) void switchToWorkspace(workspace);
    };
    return html`<button class="item" role="menuitemradio" aria-checked=${String(isCurrent)} @click=${open}>
      <span class="mark">${isCurrent ? checkIcon() : undefined}</span>
      <span class="name">${workspace.name}</span>
      ${workspace.hasMasterPassword ? html`<span class="mark" title="Asks for its master password">${lockIcon()}</span>` : undefined}
    </button>`;
  }

  private openDialog(kind: WorkspaceDialogKind) {
    return (): void => {
      this.isOpen = false;
      void this.renderRoot.querySelector<WorkspaceDialogs>("workspace-dialogs")?.open(kind);
    };
  }

  private readonly startImport = (): void => {
    this.isOpen = false;
    void this.renderRoot.querySelector<ImportDialog>("import-dialog")?.start();
  };

  private readonly startExport = (): void => {
    this.isOpen = false;
    void this.renderRoot.querySelector<ExportDialog>("export-dialog")?.open();
  };

  private readonly toggle = async (): Promise<void> => {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) return;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLElement>(".popup .item")?.focus();
  };

  private readonly closeOnEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !this.isOpen) return;
    this.isOpen = false;
    this.renderRoot.querySelector<HTMLElement>(".trigger")?.focus();
  };

  private readonly closeOnOutsideClick = (event: PointerEvent): void => {
    if (this.isOpen && !event.composedPath().includes(this)) this.isOpen = false;
  };
}

customElements.define("workspace-switcher", WorkspaceSwitcher);

declare global {
  interface HTMLElementTagNameMap {
    "workspace-switcher": WorkspaceSwitcher;
  }
}
