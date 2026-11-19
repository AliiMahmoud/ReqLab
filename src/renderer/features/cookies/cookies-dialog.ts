import { css, html, LitElement, type TemplateResult } from "lit";
import type { StoredCookie } from "@shared/models/cookie";
import { api } from "../../api";
import { dialogStyles } from "../../components/dialog-styles";
import { trashIcon } from "../../components/icons";
import { formStyles } from "../../components/shared-styles";
import { askToConfirm } from "../../stores/confirm-store";
import { callApi } from "../../stores/notice-store";

/** The workspace's cookie jar: cookies received from servers, by domain. Delete one or clear them all. */
export class CookiesDialog extends LitElement {
  static override styles = [
    formStyles,
    dialogStyles,
    css`
      dialog {
        width: min(760px, calc(100% - 32px));
      }
      .domain {
        margin: var(--space-3) 0 var(--space-1);
        font-weight: 600;
      }
      .cookie {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto 30px;
        gap: var(--space-2);
        align-items: center;
        padding: 6px 8px;
        border-bottom: 1px solid var(--color-border-soft);
        font-family: var(--font-code);
        font-size: 12px;
      }
      .value {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--color-text-muted);
      }
      .meta {
        color: var(--color-text-faint);
        font-size: 11px;
        white-space: nowrap;
      }
      .list {
        max-height: 50vh;
        overflow-y: auto;
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
  static override properties = { workspaceId: { attribute: false }, cookies: { state: true } };

  declare workspaceId: string;
  declare cookies: StoredCookie[];

  constructor() {
    super();
    this.cookies = [];
  }

  async open(): Promise<void> {
    await this.reload();
    this.renderRoot.querySelector("dialog")?.showModal();
  }

  override render(): TemplateResult {
    const domains = [...new Set(this.cookies.map((cookie) => cookie.domain))];
    return html`<dialog>
      <strong>Cookies</strong>
      <p class="hint">
        Received from servers and sent back automatically. Stored in this workspace's encrypted file.
      </p>
      <div class="list">
        ${domains.length === 0 ? html`<p class="hint">No cookies yet.</p>` : domains.map((domain) => this.renderDomain(domain))}
      </div>
      <div class="actions">
        <button class="danger" ?disabled=${this.cookies.length === 0} @click=${this.clearAll}>
          Clear all
        </button>
        <button class="primary" @click=${this.close}>Done</button>
      </div>
    </dialog>`;
  }

  private renderDomain(domain: string): TemplateResult {
    const cookies = this.cookies.filter((cookie) => cookie.domain === domain);
    return html`<div class="domain">${domain}</div>
      ${cookies.map((cookie) => this.renderCookie(cookie))}`;
  }

  private renderCookie(cookie: StoredCookie): TemplateResult {
    const remove = async (): Promise<void> => {
      await callApi(
        api.deleteCookie({
          workspaceId: this.workspaceId,
          domain: cookie.domain,
          path: cookie.path,
          name: cookie.name,
        }),
      );
      await this.reload();
    };
    return html`<div class="cookie">
      <span>${cookie.name}</span>
      <span class="value" title=${cookie.value}>${cookie.value}</span>
      <span class="meta">${describe(cookie)}</span>
      <button class="remove" aria-label="Delete cookie ${cookie.name}" title="Delete" @click=${remove}>
        ${trashIcon(15)}
      </button>
    </div>`;
  }

  private async reload(): Promise<void> {
    this.cookies = (await callApi(api.listCookies({ workspaceId: this.workspaceId }))) ?? [];
  }

  private readonly clearAll = async (): Promise<void> => {
    const confirmed = await askToConfirm({
      kind: "clear-cookies",
      title: "Clear all cookies?",
      message: "Every cookie in this workspace is deleted.",
      confirmLabel: "Clear all",
      isDanger: true,
    });
    if (!confirmed) return;
    await callApi(api.clearCookies({ workspaceId: this.workspaceId }));
    await this.reload();
  };

  private readonly close = (): void => {
    this.renderRoot.querySelector("dialog")?.close();
  };
}

/** "path /v1 · expires 17 Nov · Secure · HttpOnly". */
function describe(cookie: StoredCookie): string {
  const expires =
    cookie.expiresAt === null ? "session" : `expires ${new Date(cookie.expiresAt).toLocaleString()}`;
  const flags = [
    cookie.isSecure ? "Secure" : "",
    cookie.isHttpOnly ? "HttpOnly" : "",
    cookie.isHostOnly ? "" : "subdomains",
  ];
  return [`path ${cookie.path}`, expires, ...flags.filter(Boolean)].join(" · ");
}

customElements.define("cookies-dialog", CookiesDialog);

declare global {
  interface HTMLElementTagNameMap {
    "cookies-dialog": CookiesDialog;
  }
}
