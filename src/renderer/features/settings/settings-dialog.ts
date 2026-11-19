import { html, LitElement, type TemplateResult } from "lit";
import type { WorkspaceSummary } from "@shared/models/workspace";
import { dialogStyles } from "../../components/dialog-styles";
import { closeIcon, monitorIcon, moonIcon, settingsIcon, sunIcon } from "../../components/icons";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { resetSkippedConfirmations } from "../../stores/confirm-store";
import { showNotice } from "../../stores/notice-store";
import { palettes, setTheme, themeChoice, type ThemeChoice } from "../../stores/theme-store";
import { renderThemePicker, themePickerStyles } from "./theme-picker";
import { renderAppearanceRows, renderEditingRows } from "./app-settings-section";
import "./request-settings-section";
import "./data-location-section";
import { settingRowStyles } from "./setting-row-styles";
import { appSettings } from "../../stores/app-settings-store";
import "./network-settings-panel";
import { settingsDialogStyles } from "./settings-dialog-styles";

type Section = "general" | "theme" | "network";

const THEMES: { value: ThemeChoice; label: string; icon: () => TemplateResult }[] = [
  { value: "system", label: "System", icon: monitorIcon },
  { value: "light", label: "Light", icon: sunIcon },
  { value: "dark", label: "Dark", icon: moonIcon },
];

/** Every setting in one place (the gear in the header): General, Theme and Network. */
export class SettingsDialog extends LitElement {
  static override styles = [
    formStyles,
    dialogStyles,
    settingsDialogStyles,
    themePickerStyles,
    settingRowStyles,
  ];
  static override properties = { workspace: { attribute: false }, section: { state: true } };

  declare workspace: WorkspaceSummary;
  declare section: Section;

  constructor() {
    super();
    this.section = "general";
    watch(this, themeChoice, palettes, appSettings);
  }

  async open(section: Section = "general"): Promise<void> {
    this.section = section;
    await this.updateComplete;
    this.renderRoot.querySelector("dialog")?.showModal();
  }

  override render(): TemplateResult {
    return html`<dialog aria-label="Settings">
      <div class="frame">
        <header>
          <strong>Settings</strong>
          <button class="close" aria-label="Close settings" title="Close" @click=${this.close}>
            ${closeIcon()}
          </button>
        </header>
        <nav aria-label="Settings sections">
          ${this.renderNavButton("general", "General")} ${this.renderNavButton("theme", "Theme")}
          ${this.renderNavButton("network", "Network")}
        </nav>
        <div class="content">${this.renderSection()}</div>
      </div>
    </dialog>`;
  }

  private renderSection(): TemplateResult {
    if (this.section === "theme") return this.renderTheme();
    return this.section === "general" ? this.renderGeneral() : this.renderNetwork();
  }

  private renderNavButton(section: Section, label: string): TemplateResult {
    const choose = (): void => {
      this.section = section;
    };
    return html`<button aria-current=${this.section === section ? "page" : "false"} @click=${choose}>
      ${label}
    </button>`;
  }

  private renderGeneral(): TemplateResult {
    return html`<h2>General</h2>
      <p class="lead">Request applies to this workspace; the rest to this app on this computer.</p>
      <request-settings-section .workspaceId=${this.workspace.id}></request-settings-section>
      <data-location-section></data-location-section>
      ${renderEditingRows()}
      <h3 class="group">Confirmations</h3>
      <div class="setting">
        <div>
          <div class="title">Don't ask again</div>
          <p class="hint">Ask again every question you answered with "Don't ask again".</p>
        </div>
        <button @click=${resetConfirmations}>Reset "Don't ask again"</button>
      </div>`;
  }

  private renderTheme(): TemplateResult {
    return html`<h2>Theme</h2>
      <p class="lead">Colours, fonts and size of the app on this computer.</p>
      <h3 class="group">Text</h3>
      ${renderAppearanceRows()}
      <h3 class="group">Colours</h3>
      <div class="setting">
        <div>
          <div class="title">Mode</div>
          <p class="hint">System follows your computer's light or dark mode.</p>
        </div>
        <div class="segmented" role="group" aria-label="Theme mode">
          ${THEMES.map((theme) => this.renderThemeButton(theme))}
        </div>
      </div>
      ${renderThemePicker()}`;
  }

  private renderThemeButton(theme: (typeof THEMES)[number]): TemplateResult {
    const choose = (): void => {
      setTheme(theme.value);
    };
    return html`<button aria-pressed=${String(themeChoice.get() === theme.value)} @click=${choose}>
      ${theme.icon()} ${theme.label}
    </button>`;
  }

  private renderNetwork(): TemplateResult {
    return html`<h2>Network</h2>
      <p class="lead">
        TLS, certificates and proxy for the "${this.workspace.name}" workspace, kept in its encrypted file.
      </p>
      <network-settings-panel .workspaceId=${this.workspace.id}></network-settings-panel>`;
  }

  private readonly close = (): void => {
    this.renderRoot.querySelector("dialog")?.close();
  };
}

function resetConfirmations(): void {
  resetSkippedConfirmations();
  showNotice("Every confirmation will be asked again.", false);
}

/** The gear button that opens Settings. */
export function renderSettingsButton(open: () => void): TemplateResult {
  return html`<button class="icon ghost settings-gear" aria-label="Settings" title="Settings" @click=${open}>
    ${settingsIcon(20)}
  </button>`;
}

customElements.define("settings-dialog", SettingsDialog);

declare global {
  interface HTMLElementTagNameMap {
    "settings-dialog": SettingsDialog;
  }
}
