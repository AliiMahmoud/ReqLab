import { html, LitElement, type TemplateResult } from "lit";
import type { RequestSettings } from "@shared/models/request-settings";
import { api } from "../../api";
import { formStyles } from "../../components/shared-styles";
import { loadNetworkSettings } from "../../stores/network-store";
import { callApi } from "../../stores/notice-store";
import { settingsDialogStyles } from "./settings-dialog-styles";
import { settingRowStyles } from "./setting-row-styles";

/** Settings › General › Request: timeout, response size, redirects, certificate checks and cookies (per workspace). */
export class RequestSettingsSection extends LitElement {
  static override styles = [formStyles, settingsDialogStyles, settingRowStyles];
  static override properties = { workspaceId: { attribute: false }, settings: { state: true } };

  declare workspaceId: string;
  declare settings: RequestSettings | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    void callApi(api.getRequestSettings({ workspaceId: this.workspaceId })).then((settings) => {
      this.settings = settings;
    });
  }

  override render(): TemplateResult | undefined {
    const settings = this.settings;
    if (settings === undefined) return undefined;
    return html`<h3 class="group">Request</h3>
      ${this.renderNumber({ label: "Request timeout (ms)", hint: "0 = no timeout.", field: "timeoutMs", min: 0, max: 3_600_000 })}
      ${this.renderNumber({ label: "Max response size (MB)", hint: "Bigger responses are stopped.", field: "maxResponseMb", min: 1, max: 1024 })}
      ${this.renderToggle("followRedirects", "Follow redirects", "Off: a 3xx response is shown as it is.")}
      ${this.renderToggle("verifyTls", "SSL certificate verification", "Off: the server's identity is not checked.")}
      ${this.renderToggle("disableCookies", "Disable cookies", "Cookies are neither sent nor saved.")}`;
  }

  private renderNumber(row: {
    label: string;
    hint: string;
    field: "timeoutMs" | "maxResponseMb";
    min: number;
    max: number;
  }): TemplateResult {
    const change = (event: Event): void => {
      this.saveNumber(event.target as HTMLInputElement, row);
    };
    return html`<div class="setting">
      <div>
        <div class="title">${row.label}</div>
        <p class="hint">${row.hint}</p>
      </div>
      <input
        class="number"
        type="number"
        aria-label=${row.label}
        min=${row.min}
        max=${row.max}
        .value=${String(this.settings?.[row.field] ?? "")}
        @change=${change}
      />
    </div>`;
  }

  private renderToggle(
    field: "verifyTls" | "followRedirects" | "disableCookies",
    label: string,
    hint: string,
  ): TemplateResult {
    const change = (event: Event): void => {
      void this.save({ [field]: (event.target as HTMLInputElement).checked });
    };
    return html`<div class="setting">
      <div>
        <div class="title">${label}</div>
        <p class="hint">${hint}</p>
      </div>
      <input
        class="switch"
        type="checkbox"
        role="switch"
        aria-label=${label}
        .checked=${this.settings?.[field] ?? false}
        @change=${change}
      />
    </div>`;
  }

  /** Out-of-range or non-numbers put the saved value back. */
  private saveNumber(
    input: HTMLInputElement,
    row: { field: "timeoutMs" | "maxResponseMb"; min: number; max: number },
  ): void {
    const value = Math.round(Number(input.value));
    if (input.value.trim() === "" || !Number.isFinite(value) || value < row.min || value > row.max) {
      input.value = String(this.settings?.[row.field] ?? row.min);
      return;
    }
    void this.save({ [row.field]: value });
  }

  private async save(change: Partial<RequestSettings>): Promise<void> {
    if (this.settings === undefined) return;
    const saved = await callApi(
      api.updateRequestSettings({ workspaceId: this.workspaceId, settings: { ...this.settings, ...change } }),
    );
    if (saved === undefined) return;
    this.settings = saved;
    // The "TLS off" badge by Send follows certificate checks.
    if ("verifyTls" in change) await loadNetworkSettings(this.workspaceId);
  }
}

customElements.define("request-settings-section", RequestSettingsSection);

declare global {
  interface HTMLElementTagNameMap {
    "request-settings-section": RequestSettingsSection;
  }
}
