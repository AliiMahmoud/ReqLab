import { html, LitElement, type TemplateResult } from "lit";
import type { NetworkLogView } from "@shared/models/network-log";
import { api } from "../../api";
import "../../components/code-area";
import { closeIcon } from "../../components/icons";
import { showModal } from "../../components/modal-dialog";
import { formStyles } from "../../components/shared-styles";
import { callApi, showNotice } from "../../stores/notice-store";
import { renderError, renderExchange, renderSummary, renderTimeline } from "./network-log-sections";
import { networkLogStyles } from "./network-log-styles";

type LogView = "details" | "json";

/**
 * A send's network log, like Postman's console: a summary, the error, each exchange (network,
 * headers and bodies as sent and received, timing) and a timeline; or the same as JSON.
 * Main keeps the last 20 sends' logs, with credentials redacted and secrets masked, until it closes.
 */
export class NetworkLogDialog extends LitElement {
  static override styles = [formStyles, networkLogStyles];
  static override properties = { log: { state: true }, view: { state: true } };

  /** Undefined while loading; null when main no longer keeps this log. */
  declare log: NetworkLogView | null | undefined;
  declare view: LogView;
  #requestId = "";

  constructor() {
    super();
    this.view = "details";
  }

  async open(requestId: string): Promise<void> {
    this.#requestId = requestId;
    this.log = undefined;
    await this.updateComplete;
    showModal(this.renderRoot.querySelector("dialog"));
    this.log = (await callApi(api.getNetworkLog({ requestId }))) ?? null;
  }

  override render(): TemplateResult {
    return html`<dialog aria-label="Network log">
      <header>
        <strong>Network log</strong>
        ${this.renderViewButton("details", "Details")} ${this.renderViewButton("json", "JSON")}
        <button ?disabled=${!this.log} @click=${this.copy}>Copy</button>
        <button class="close" aria-label="Close" title="Close" @click=${this.close}>${closeIcon()}</button>
      </header>
      ${this.renderContent()}
    </dialog>`;
  }

  private renderViewButton(view: LogView, label: string): TemplateResult {
    const choose = (): void => {
      this.view = view;
    };
    return html`<button aria-pressed=${String(this.view === view)} @click=${choose}>${label}</button>`;
  }

  private renderContent(): TemplateResult {
    const log = this.log;
    if (log === undefined) return html`<div class="body"><p class="empty">Loading…</p></div>`;
    if (log === null) {
      return html`<div class="body">
        <p class="empty">
          No log for this request. ReqLab keeps the logs of the last 20 requests until it closes.
        </p>
      </div>`;
    }
    if (this.view === "json") {
      return html`<code-area
        .value=${JSON.stringify(log, null, 2)}
        .label=${"Network log (JSON)"}
        .language=${"json"}
        .readOnly=${true}
        .wrap=${true}
      ></code-area>`;
    }
    return html`<div class="body">
      ${renderSummary(log)} ${renderError(log.error)} ${log.exchanges.map(renderExchange)}
      ${renderTimeline(log.events)}
    </div>`;
  }

  private readonly copy = async (): Promise<void> => {
    const copied = await callApi(api.copyNetworkLog({ requestId: this.#requestId }));
    if (copied !== undefined) showNotice("Log copied as JSON.", false);
  };

  private readonly close = (): void => {
    this.renderRoot.querySelector("dialog")?.close();
  };
}

customElements.define("network-log-dialog", NetworkLogDialog);

declare global {
  interface HTMLElementTagNameMap {
    "network-log-dialog": NetworkLogDialog;
  }
}
