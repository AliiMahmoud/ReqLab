import { html, LitElement, type TemplateResult } from "lit";
import { MAX_WORKSPACE_NAME_LENGTH, MIN_MASTER_PASSWORD_LENGTH } from "@shared/limits";
import { entryCardStyles } from "../../components/entry-card-styles";
import { logoIcon } from "../../components/icons";
import { formStyles, readField } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { signal } from "../../stores/signal";
import {
  cancelAddingWorkspace,
  createWorkspace,
  errorMessage,
  isBusy,
  securityStatus,
  workspaces,
} from "../../stores/workspace-store";
import type { ImportDialog } from "../interop/import-dialog";
import "../interop/import-dialog";

/**
 * The first thing a new user sees: name a workspace, or import one (Postman export or .reqlab bundle).
 * A master password is asked for only where the OS has no real keychain.
 */
export class WelcomeScreen extends LitElement {
  static override styles = [formStyles, entryCardStyles];

  readonly #formError = signal<string | undefined>(undefined);

  constructor() {
    super();
    watch(this, isBusy, securityStatus, errorMessage, workspaces, this.#formError);
  }

  override render(): TemplateResult {
    const hasWorkspaces = workspaces.get().length > 0;
    return html`<div class="card">
      <div class="brand">${logoIcon()}<span>ReqLab</span></div>
      <h1>${hasWorkspaces ? "Add a workspace" : "Create your workspace"}</h1>
      <p class="lead">Collections, environments and history live in one encrypted file on this computer.</p>
      <form @submit=${this.submit}>
        <label>
          Workspace name
          <input name="name" required autofocus autocomplete="off" maxlength=${MAX_WORKSPACE_NAME_LENGTH} />
        </label>
        ${this.renderPasswordFields()}
        <p class="error" role="alert">${this.#formError.get() ?? errorMessage.get() ?? ""}</p>
        <button class="primary wide" ?disabled=${isBusy.get()}>Create workspace</button>
      </form>
      <div class="divider">or</div>
      <button class="wide" @click=${this.openImport}>Import workspace…</button>
      <p class="hint">
        A collection (v2.0 / v2.1 .json), environment or data export, or a ReqLab .reqlab bundle.
      </p>
      ${hasWorkspaces ? html`<button class="ghost" @click=${cancelAddingWorkspace}>← Back</button>` : undefined}
      <import-dialog></import-dialog>
    </div>`;
  }

  /** Only on systems without a real keychain (Linux with no keyring). */
  private renderPasswordFields(): TemplateResult | undefined {
    if (securityStatus.get()?.isMasterPasswordRequired !== true) return undefined;
    return html`
      <label>
        Master password (required on this system: there is no keychain)
        <input name="password" type="password" required autocomplete="new-password" />
      </label>
      <label>
        Repeat master password
        <input name="confirmation" type="password" required autocomplete="new-password" />
      </label>
    `;
  }

  protected override firstUpdated(): void {
    this.renderRoot.querySelector<HTMLInputElement>("input[name=name]")?.focus();
  }

  private readonly openImport = (): void => {
    void this.renderRoot.querySelector<ImportDialog>("import-dialog")?.start();
  };

  private readonly submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const password = readField(form, "password");
    const problem = findPasswordProblem(password, readField(form, "confirmation"));
    this.#formError.set(problem);
    if (problem !== undefined) return;
    await createWorkspace(readField(form, "name").trim(), password === "" ? undefined : password);
  };
}

function findPasswordProblem(password: string, confirmation: string): string | undefined {
  if (password === "") return undefined;
  if (password.length < MIN_MASTER_PASSWORD_LENGTH) {
    return `Use at least ${String(MIN_MASTER_PASSWORD_LENGTH)} characters.`;
  }
  return password === confirmation ? undefined : "The two passwords do not match.";
}

customElements.define("welcome-screen", WelcomeScreen);

declare global {
  interface HTMLElementTagNameMap {
    "welcome-screen": WelcomeScreen;
  }
}
