import { css, html, LitElement, type TemplateResult } from "lit";
import type { NetworkSettingsView, ProxyMode } from "@shared/models/network-settings";
import { api } from "../../api";
import { trashIcon } from "../../components/icons";
import { formStyles, readField } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { loadNetworkSettings, networkSettings, showNetworkSettings } from "../../stores/network-store";
import { callApi } from "../../stores/notice-store";
import { settingRowStyles } from "./setting-row-styles";
import { inputValue, isChecked, preventSubmit, renderSwitchRow } from "./network-settings-parts";
import { isProxyMode, renderProxySection } from "./proxy-settings-parts";

/**
 * Per-workspace network settings: TLS verification, extra CA certificates, client certificates (mTLS)
 * and the proxy (none, system or custom). Certificate files are picked by main; keys and passwords never come back here.
 */
export class NetworkSettingsPanel extends LitElement {
  static override styles = [
    formStyles,
    settingRowStyles,
    css`
      :host {
        display: grid;
        gap: var(--space-2);
      }
      /* A heading with its hint on the left and an on/off switch on the right. */
      .switch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
      }
      .switch-row .hint {
        margin: 2px 0 0;
      }
      /* The custom proxy's fields are unused in the other proxy modes. */
      .is-off .row {
        opacity: 0.45;
      }
      section {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3) 0;
        border-top: 1px solid var(--color-border-soft);
      }
      h3 {
        margin: 0;
        font-size: 13px;
      }
      .entry {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: 12px;
      }
      .entry .text {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .row {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .row input {
        flex: 1;
        min-width: 160px;
      }
      .warning {
        color: var(--color-warning);
        font-size: 12px;
      }
      .remove {
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--color-text-faint);
      }
      .remove:hover:not(:disabled) {
        background: transparent;
        color: var(--color-danger);
      }
    `,
  ];
  static override properties = { workspaceId: { attribute: false } };

  declare workspaceId: string;

  constructor() {
    super();
    watch(this, networkSettings);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void loadNetworkSettings(this.workspaceId);
  }

  override render(): TemplateResult | undefined {
    const settings = networkSettings.get();
    return settings === undefined ? undefined : this.renderSections(settings);
  }

  private renderSections(settings: NetworkSettingsView): TemplateResult {
    // Every change saves at once (no Save button).
    return html`<form @change=${this.saveGeneral} @submit=${preventSubmit}>
        <section>
          ${renderSwitchRow({
            name: "verifyTls",
            title: "Verify server certificates",
            hint: "SSL certificate verification for https requests.",
            isOn: settings.verifyTls,
          })}
          ${settings.verifyTls ? undefined : html`<p class="warning">⚠ Off: the server's identity is not checked. Use only for local or test servers.</p>`}
        </section>
        ${renderProxySection(settings.proxy, this.chooseProxyMode)}
      </form>
      ${this.renderCaCertificates(settings)} ${this.renderClientCertificates(settings)}`;
  }

  private renderCaCertificates(settings: NetworkSettingsView): TemplateResult {
    return html`<section>
      <h3>CA certificates</h3>
      <p class="hint">
        Trusted in addition to the system's certificates, e.g. for an internal or self-signed server.
      </p>
      ${settings.caCertificates.map(
        (certificate) =>
          html`<div class="entry">
            <span class="text" title=${certificate.subject}
              >${certificate.fileName} · ${certificate.subject} · until ${certificate.validTo}</span
            >
            ${this.renderRemove(certificate.id, certificate.fileName)}
          </div>`,
      )}
      <div><button @click=${this.addCaCertificate}>Add CA certificate…</button></div>
    </section>`;
  }

  private renderClientCertificates(settings: NetworkSettingsView): TemplateResult {
    return html`<section>
      <h3>Client certificates (mTLS)</h3>
      ${settings.clientCertificates.map(
        (certificate) =>
          html`<div class="entry">
            <span class="text"
              >${certificate.host} · ${certificate.certificateFile} +
              ${certificate.keyFile}${certificate.hasPassphrase ? " · passphrase" : ""}</span
            >
            ${this.renderRemove(certificate.id, certificate.host)}
          </div>`,
      )}
      <form class="row" @submit=${this.addClientCertificate}>
        <input name="host" required aria-label="Host" placeholder="api.example.com or *.example.com" />
        <input
          name="passphrase"
          type="password"
          aria-label="Key passphrase"
          autocomplete="off"
          placeholder="Key passphrase (if any)"
        />
        <button>Add certificate and key…</button>
      </form>
    </section>`;
  }

  private renderRemove(id: string, name: string): TemplateResult {
    const remove = async (): Promise<void> => {
      showNetworkSettings(await callApi(api.removeCertificate({ workspaceId: this.workspaceId, id })));
    };
    return html`<button class="remove" aria-label="Remove ${name}" title="Remove" @click=${remove}>
      ${trashIcon(15)}
    </button>`;
  }

  private readonly saveGeneral = (event: Event): void => {
    const mode = networkSettings.get()?.proxy.mode ?? "system";
    void this.save(event.currentTarget as HTMLFormElement, mode);
  };

  private readonly chooseProxyMode = (mode: string): void => {
    const form = this.renderRoot.querySelector("form");
    if (form !== null && isProxyMode(mode)) void this.save(form, mode);
  };

  private async save(form: HTMLFormElement, mode: ProxyMode): Promise<void> {
    const username = inputValue(form, "proxyUsername");
    const password = inputValue(form, "proxyPassword");
    const credentials = username === "" && password === "" ? {} : { username, password };
    const saved = await callApi(
      api.updateNetworkSettings({
        workspaceId: this.workspaceId,
        verifyTls: isChecked(form, "verifyTls"),
        proxy: {
          mode,
          url: inputValue(form, "proxyUrl"),
          bypass: inputValue(form, "proxyBypass"),
          ...credentials,
        },
      }),
    );
    showNetworkSettings(saved);
  }

  private readonly addCaCertificate = async (): Promise<void> => {
    showNetworkSettings(await callApi(api.addCaCertificate({ workspaceId: this.workspaceId })));
  };

  private readonly addClientCertificate = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const passphrase = readField(form, "passphrase");
    const view = await callApi(
      api.addClientCertificate({
        workspaceId: this.workspaceId,
        host: readField(form, "host"),
        ...(passphrase === "" ? {} : { passphrase }),
      }),
    );
    showNetworkSettings(view);
    if (view !== null && view !== undefined) form.reset();
  };
}

customElements.define("network-settings-panel", NetworkSettingsPanel);

declare global {
  interface HTMLElementTagNameMap {
    "network-settings-panel": NetworkSettingsPanel;
  }
}
