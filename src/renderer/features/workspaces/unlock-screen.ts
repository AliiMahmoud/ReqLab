import { html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import type { WorkspaceSummary } from "@shared/models/workspace";
import { entryCardStyles } from "../../components/entry-card-styles";
import { logoIcon } from "../../components/icons";
import { formStyles, readField } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import {
  addWorkspace,
  errorMessage,
  isBusy,
  switchToWorkspace,
  unlockWorkspace,
  workspaces,
} from "../../stores/workspace-store";

/**
 * Shown only when a workspace cannot open by itself: it has a master password, or it was locked
 * after inactivity, sleep or screen lock. Other workspaces stay one click away.
 */
export class UnlockScreen extends LitElement {
  static override styles = [formStyles, entryCardStyles];
  static override properties = { workspace: { attribute: false } };

  declare workspace: WorkspaceSummary;

  constructor() {
    super();
    watch(this, isBusy, errorMessage, workspaces);
  }

  override render(): TemplateResult {
    const others = workspaces.get().filter((workspace) => workspace.id !== this.workspace.id);
    return html`<div class="card">
      <div class="brand">${logoIcon()}<span>ReqLab</span></div>
      <h1>${this.workspace.name}</h1>
      <form @submit=${this.submit}>
        ${
          this.workspace.hasMasterPassword
            ? html`<label
                >Master password
                <input name="password" type="password" required autocomplete="current-password"
              /></label>`
            : html`<p class="lead">Locked after inactivity, sleep or screen lock.</p>`
        }
        <p class="error" role="alert">${errorMessage.get() ?? ""}</p>
        <button class="primary wide" ?disabled=${isBusy.get()}>Open workspace</button>
      </form>
      ${others.length > 0 ? this.renderOthers(others) : undefined}
      <button class="ghost" @click=${addWorkspace}>New or import workspace…</button>
    </div>`;
  }

  private renderOthers(others: WorkspaceSummary[]): TemplateResult {
    return html`<div class="divider">other workspaces</div>
      <div class="links">
        ${others.map((workspace) => html`<button @click=${() => switchToWorkspace(workspace)}>${workspace.name}</button>`)}
      </div>`;
  }

  /** Ready to type: the password field (or the Open button) takes focus whenever the workspace changes. */
  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("workspace")) return;
    const field = this.renderRoot.querySelector<HTMLElement>("input[name=password]");
    (field ?? this.renderRoot.querySelector<HTMLElement>("button.primary"))?.focus();
  }

  private readonly submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const password = this.workspace.hasMasterPassword ? readField(form, "password") : undefined;
    form.reset();
    await unlockWorkspace(this.workspace.id, password);
  };
}

customElements.define("unlock-screen", UnlockScreen);

declare global {
  interface HTMLElementTagNameMap {
    "unlock-screen": UnlockScreen;
  }
}
