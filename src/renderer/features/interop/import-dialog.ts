import { html, LitElement, type TemplateResult } from "lit";
import type { ChosenImport, ImportReport } from "@shared/models/interop";
import { MAX_WORKSPACE_NAME_LENGTH } from "@shared/limits";
import { dialogStyles } from "../../components/dialog-styles";
import { formStyles, readField } from "../../components/shared-styles";
import { chooseImportFiles, runImport } from "../../stores/interop-store";
import { showCreatedWorkspace } from "../../stores/workspace-store";

/**
 * Import a workspace: main's file dialog picks the files, then the user names the new workspace
 * (and gives a .reqlab bundle's passphrase). Ends with a report of what came across and what did not.
 */
export class ImportDialog extends LitElement {
  static override styles = [formStyles, dialogStyles];
  static override properties = {
    chosen: { state: true },
    report: { state: true },
    error: { state: true },
    isImporting: { state: true },
  };

  declare chosen: ChosenImport | undefined;
  declare report: ImportReport | undefined;
  declare error: string | undefined;
  declare isImporting: boolean;

  constructor() {
    super();
    this.isImporting = false;
  }

  /** Opens main's file dialog; shows this dialog only if files were picked. */
  async start(): Promise<void> {
    const chosen = await chooseImportFiles();
    this.report = undefined;
    this.error = chosen.ok ? undefined : chosen.error.message;
    this.chosen = chosen.ok ? (chosen.value ?? undefined) : undefined;
    if (this.chosen === undefined && this.error === undefined) return;
    await this.updateComplete;
    this.renderRoot.querySelector("form")?.reset();
    this.renderRoot.querySelector("dialog")?.showModal();
  }

  override render(): TemplateResult {
    return html`<dialog>
      ${this.report === undefined ? this.renderDetails() : this.renderReport(this.report)}
    </dialog>`;
  }

  private renderDetails(): TemplateResult {
    const chosen = this.chosen;
    return html`<form @submit=${this.submit}>
      <strong>Import workspace</strong>
      ${chosen === undefined ? undefined : this.renderChosen(chosen)}
      <p class="error" role="alert">${this.error ?? ""}</p>
      <div class="actions">
        <button type="button" @click=${this.close}>Cancel</button>
        ${
          chosen === undefined
            ? undefined
            : html`<button class="primary" ?disabled=${this.isImporting}>
                ${this.isImporting ? "Importing…" : "Import"}
              </button>`
        }
      </div>
    </form>`;
  }

  private renderChosen(chosen: ChosenImport): TemplateResult {
    return html`
      <p class="hint">${chosen.kind === "reqlab" ? "ReqLab bundle" : "Collection export"}</p>
      <ul class="files">
        ${chosen.fileNames.map((name) => html`<li>${name}</li>`)}
      </ul>
      <label
        >New workspace name
        <input
          name="name"
          required
          autocomplete="off"
          maxlength=${MAX_WORKSPACE_NAME_LENGTH}
          .defaultValue=${chosen.suggestedName}
        />
      </label>
      ${
        chosen.isEncrypted
          ? html`<label
              >Bundle passphrase <input name="passphrase" type="password" required autocomplete="off"
            /></label>`
          : undefined
      }
    `;
  }

  private renderReport(report: ImportReport): TemplateResult {
    const counts: [string, number][] = [
      ["Collections", report.collections],
      ["Folders", report.folders],
      ["Requests", report.requests],
      ["Environments", report.environments],
      ["Variables", report.variables],
    ];
    return html`<form @submit=${this.openImported}>
      <strong>Imported "${report.workspace.name}"</strong>
      <div class="counts">
        ${counts.map(([label, value]) => html`<div class="count"><strong>${String(value)}</strong>${label}</div>`)}
      </div>
      ${
        report.warnings.length === 0
          ? html`<p class="hint">Everything came across.</p>`
          : html`<p class="hint">Not imported:</p>
              <ul class="warnings">
                ${report.warnings.map((warning) => html`<li>${warning}</li>`)}
              </ul>`
      }
      <div class="actions"><button class="primary">Open workspace</button></div>
    </form>`;
  }

  private readonly close = (): void => {
    this.renderRoot.querySelector("dialog")?.close();
  };

  private readonly submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (this.chosen === undefined) return;
    const form = event.currentTarget as HTMLFormElement;
    const passphrase = this.chosen.isEncrypted ? readField(form, "passphrase") : undefined;
    this.isImporting = true;
    const result = await runImport({
      token: this.chosen.token,
      workspaceName: readField(form, "name").trim(),
      passphrase,
    });
    this.isImporting = false;
    this.error = result.ok ? undefined : result.error.message;
    if (result.ok) this.report = result.value;
  };

  private readonly openImported = (event: SubmitEvent): void => {
    event.preventDefault();
    if (this.report !== undefined) showCreatedWorkspace(this.report.workspace);
    this.close();
  };
}

customElements.define("import-dialog", ImportDialog);

declare global {
  interface HTMLElementTagNameMap {
    "import-dialog": ImportDialog;
  }
}
