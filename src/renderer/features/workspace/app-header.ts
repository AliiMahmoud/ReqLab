import { css, html, LitElement, type TemplateResult } from "lit";
import type { WorkspaceSummary } from "@shared/models/workspace";
import { logoIcon, slidersIcon } from "../../components/icons";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { activeEnvironmentId, createEnvironment, environments } from "../../stores/environment-store";
import { mainView, openInEnvironments } from "../../stores/view-store";
import "./workspace-switcher";
import { historyButtonStyles, renderHistoryButtons } from "./history-buttons";
import { canGoBack, canGoForward } from "../../stores/navigation-store";
import { environmentDot } from "../environments/environment-colors";
import { renderSettingsButton, type SettingsDialog } from "../settings/settings-dialog";
import "../../components/ui-select";
import type { SelectOption } from "../../components/ui-select";

/** The button inside the environment picker, beside the chosen environment's name. */
const MANAGE_ENVIRONMENTS = { label: "Manage environments", icon: slidersIcon(), run: showEnvironments };

/** The last option of the environment picker: creates an environment instead of choosing one. */
const NEW_ENVIRONMENT = "__new-environment__";

/** The title bar (52 px): logo, the workspace dropdown and "+", then the environment picker and the Settings gear. */
export class AppHeader extends LitElement {
  static override styles = [
    formStyles,
    historyButtonStyles,
    css`
      /* The window's title bar: drag it to move the window; controls inside stay clickable. */
      :host {
        position: relative;
        display: flex;
        align-items: center;
        gap: var(--space-4);
        height: var(--title-bar-height);
        padding: 0 var(--title-bar-inset-right) 0 var(--title-bar-inset-left);
        border-bottom: 1px solid var(--color-border);
        background: var(--color-surface);
        -webkit-app-region: drag;
        user-select: none;
      }
      button,
      label,
      ui-select,
      workspace-switcher,
      settings-dialog {
        -webkit-app-region: no-drag;
      }
      /* A little room between the window buttons and the workspace name. */
      workspace-switcher {
        margin-left: 4px;
      }
      /* The logo sits in the middle of the bar, like a window title. */
      .brand {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-weight: 600;
        font-size: calc(14px * var(--text-scale));
        pointer-events: none;
      }
      .context {
        color: var(--color-text-muted);
        font-size: calc(13.5px * var(--text-scale));
      }
      .spacer {
        flex: 1;
      }
      label {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      ui-select {
        min-width: 200px;
      }
      ui-select::part(trigger) {
        padding: 7px 10px;
        font-size: calc(14px * var(--text-scale));
      }
    `,
  ];
  static override properties = { workspace: { attribute: false } };

  declare workspace: WorkspaceSummary;

  constructor() {
    super();
    watch(this, environments, activeEnvironmentId, mainView, canGoBack, canGoForward);
  }

  override render(): TemplateResult {
    const isEnvironmentsView = mainView.get() === "environments";
    return html`
      ${renderHistoryButtons()}
      <workspace-switcher .workspace=${this.workspace}></workspace-switcher>
      <div class="brand">${logoIcon()}<span>ReqLab</span></div>
      ${isEnvironmentsView ? html`<span class="context">› Environments</span>` : undefined}
      <div class="spacer"></div>
      ${isEnvironmentsView ? this.renderBackButton() : this.renderEnvironmentPicker()}
      ${renderSettingsButton(this.openSettings)}
      <settings-dialog .workspace=${this.workspace}></settings-dialog>
    `;
  }

  private renderEnvironmentPicker(): TemplateResult {
    const activeId = activeEnvironmentId.get();
    return html`
      <label class="context">
        Env
        <ui-select
          .options=${this.environmentOptions()}
          .value=${activeId ?? ""}
          .label=${"Environment"}
          .onChange=${this.chooseEnvironment}
          .triggerAction=${MANAGE_ENVIRONMENTS}
        ></ui-select>
      </label>
    `;
  }

  private renderBackButton(): TemplateResult {
    return html`<button @click=${showRequests}>Back to requests</button>`;
  }

  /** Each environment with its colour dot; protected ones are named so and shown in red. */
  private environmentOptions(): SelectOption[] {
    return [
      { value: "", label: "No environment" },
      ...environments.get().map((environment): SelectOption => ({
        value: environment.id,
        label: environment.isProtected ? `${environment.name} (protected)` : environment.name,
        dot: environmentDot(environment),
        ...(environment.isProtected ? { color: "var(--color-danger)" } : {}),
      })),
      { value: NEW_ENVIRONMENT, label: "+ New environment", color: "var(--color-link)", startsGroup: true },
    ];
  }

  /** Creates an environment and opens it on the Environments page, ready to fill in. */
  private readonly newEnvironment = async (): Promise<void> => {
    const name = `Environment ${String(environments.get().length + 1)}`;
    const created = await createEnvironment(this.workspace.id, name);
    if (created !== undefined) openInEnvironments({ scope: "environment", id: created.id });
  };

  private readonly openSettings = (): void => {
    void this.renderRoot.querySelector<SettingsDialog>("settings-dialog")?.open();
  };

  private readonly chooseEnvironment = (value: string): void => {
    if (value === NEW_ENVIRONMENT) {
      void this.newEnvironment();
      return;
    }
    activeEnvironmentId.set(value === "" ? null : value);
  };
}

function showEnvironments(): void {
  mainView.set("environments");
}

function showRequests(): void {
  mainView.set("requests");
}

customElements.define("app-header", AppHeader);

declare global {
  interface HTMLElementTagNameMap {
    "app-header": AppHeader;
  }
}
