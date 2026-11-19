import { css, html, LitElement, type TemplateResult } from "lit";
import { api } from "../../api";
import { copyIcon } from "../../components/icons";
import { formStyles } from "../../components/shared-styles";
import { callApi, showNotice } from "../../stores/notice-store";

/** Next to a saved request's name: one click copies its ID (for pm.execution.runRequest). */
export class RequestInfo extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        display: inline-flex;
      }
      button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 26px;
        padding: 0 8px;
        border: none;
        background: transparent;
        color: var(--color-text-faint);
        font-size: 11.5px;
      }
      button:hover:not(:disabled) {
        background: var(--color-hover-tint);
        color: var(--color-text);
      }
    `,
  ];
  static override properties = { workspaceId: { attribute: false }, itemId: { attribute: false } };

  declare workspaceId: string;
  declare itemId: string;

  override render(): TemplateResult {
    return html`<button
      aria-label="Copy request ID"
      title=${`Copy request ID (${this.itemId})`}
      @click=${this.copy}
    >
      ${copyIcon()} ID
    </button>`;
  }

  private readonly copy = async (): Promise<void> => {
    const copied = await callApi(api.copyRequestId({ workspaceId: this.workspaceId, itemId: this.itemId }));
    if (copied !== undefined) showNotice("Request ID copied.", false);
  };
}

customElements.define("request-info", RequestInfo);

declare global {
  interface HTMLElementTagNameMap {
    "request-info": RequestInfo;
  }
}
