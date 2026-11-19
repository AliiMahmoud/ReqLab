import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import type { RequestAuth } from "@shared/models/auth";
import type { OAuth2TokenStatus } from "@shared/models/oauth2";
import { api } from "../api";
import { activeEnvironmentId } from "../stores/environment-store";
import { callApi } from "../stores/notice-store";
import { openWorkspaceId } from "../stores/workspace-store";
import { formStyles } from "./shared-styles";

const STATUS_DELAY_MS = 400;

/**
 * The cached OAuth 2.0 token for the settings above: whether there is one, until when, and buttons
 * to get a new one or clear it. The token itself stays in main.
 */
export class OAuth2TokenPanel extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-2);
        padding-top: var(--space-2);
        border-top: 1px solid var(--color-border-soft);
        font-size: 12px;
      }
      .status {
        flex: 1;
        min-width: 180px;
        color: var(--color-text-muted);
      }
      .status.is-ready {
        color: var(--color-success);
      }
    `,
  ];
  static override properties = {
    auth: { attribute: false },
    collectionId: { attribute: false },
    status: { state: true },
    isBusy: { state: true },
  };

  declare auth: RequestAuth;
  declare collectionId: string | null;
  declare status: OAuth2TokenStatus | undefined;
  declare isBusy: boolean;
  #statusTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.collectionId = null;
    this.isBusy = false;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("auth")) return;
    clearTimeout(this.#statusTimer);
    this.#statusTimer = setTimeout(() => void this.call(api.getOAuth2Status), STATUS_DELAY_MS);
  }

  override render(): TemplateResult {
    return html`<span class="status ${this.status?.hasToken === true ? "is-ready" : ""}"
        >${describe(this.status)}</span
      >
      <button ?disabled=${this.isBusy} @click=${() => this.call(api.getOAuth2Token)}>
        ${this.isBusy ? "Getting token…" : "Get new access token"}
      </button>
      <button
        ?disabled=${this.isBusy || this.status?.hasToken !== true}
        @click=${() => this.call(api.clearOAuth2Token)}
      >
        Clear
      </button>`;
  }

  private async call(method: typeof api.getOAuth2Status): Promise<void> {
    const workspaceId = openWorkspaceId.get();
    if (workspaceId === undefined) return;
    this.isBusy = method !== api.getOAuth2Status;
    const input = {
      workspaceId,
      auth: this.auth,
      environmentId: activeEnvironmentId.get(),
      collectionId: this.collectionId,
    };
    const status = await callApi(method(input));
    this.isBusy = false;
    if (status !== undefined) this.status = status;
  }
}

function describe(status: OAuth2TokenStatus | undefined): string {
  if (status === undefined) return "";
  if (!status.hasToken)
    return status.canRefresh ? "Token expired: it is refreshed on the next send." : "No token yet.";
  const until = status.expiresAt === null ? "" : ` until ${new Date(status.expiresAt).toLocaleTimeString()}`;
  return `✓ Token ready${until}${status.canRefresh ? " (auto-refresh)" : ""}.`;
}

customElements.define("oauth2-token-panel", OAuth2TokenPanel);

declare global {
  interface HTMLElementTagNameMap {
    "oauth2-token-panel": OAuth2TokenPanel;
  }
}
