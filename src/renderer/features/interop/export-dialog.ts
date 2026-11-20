import { html, LitElement, type TemplateResult } from "lit";
import type { WorkspaceSummary } from "@shared/models/workspace";
import { dialogStyles } from "../../components/dialog-styles";
import { formStyles } from "../../components/shared-styles";
import { exportWorkspace } from "../../stores/interop-store";
import { showNotice } from "../../stores/notice-store";
import { showModal } from "../../components/modal-dialog";

/** Export the workspace as a .reqlab bundle (not encrypted: it holds every variable value as it is). */
export class ExportDialog extends LitElement {
  static override styles = [formStyles, dialogStyles];
  static override properties = {
    workspace: { attribute: false },
    error: { state: true },
    isExporting: { state: true },
  };

  declare workspace: WorkspaceSummary;
  declare error: string | undefined;
  declare isExporting: boolean;

  constructor() {
    super();
    this.isExporting = false;
  }

  async open(): Promise<void> {
    this.error = undefined;
    await this.updateComplete;
    this.renderRoot.querySelector("form")?.reset();
    showModal(this.renderRoot.querySelector("dialog"));
  }

  override render(): TemplateResult {
    return html`<dialog>
      <form @submit=${this.submit}>
        <strong>Export "${this.workspace.name}"</strong>
        <p class="hint">
          Creates a .reqlab file you can import on another computer. History is not included. The file is not
          encrypted.
        </p>
        <label class="checkbox">
          <input type="checkbox" name="includeEnvironments" checked />
          <span>Include environments and their variables</span>
        </label>
        <p class="error" role="alert">${this.error ?? ""}</p>
        <div class="actions">
          <button type="button" @click=${this.close}>Cancel</button>
          <button class="primary" ?disabled=${this.isExporting}>
            ${this.isExporting ? "Exporting…" : "Export…"}
          </button>
        </div>
      </form>
    </dialog>`;
  }

  private readonly close = (): void => {
    this.renderRoot.querySelector("dialog")?.close();
  };

  private readonly submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const includeEnvironments =
      new FormData(event.currentTarget as HTMLFormElement).get("includeEnvironments") === "on";
    this.isExporting = true;
    const result = await exportWorkspace({ workspaceId: this.workspace.id, includeEnvironments });
    this.isExporting = false;
    if (!result.ok) {
      this.error = result.error.message;
      return;
    }
    this.close();
    if (result.value !== null) showNotice(`Exported to ${result.value.fileName}.`, false);
  };
}

customElements.define("export-dialog", ExportDialog);

declare global {
  interface HTMLElementTagNameMap {
    "export-dialog": ExportDialog;
  }
}
