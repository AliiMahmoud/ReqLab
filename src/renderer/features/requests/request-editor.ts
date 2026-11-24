import { css, html, LitElement, type TemplateResult } from "lit";
import type { RequestAuth } from "@shared/models/auth";
import type { KeyValue } from "@shared/models/request";
import "../../components/key-value-table";
import { formStyles } from "../../components/shared-styles";
import { findTreeItem } from "../../stores/collection-store";
import { urlWithParams } from "../../stores/query-sync";
import type { EditorSection, RequestTab } from "../../stores/request-tab";
import { updateDraft, updateTab } from "../../stores/tab-store";
import "../../components/auth-editor";
import "./body-editor";
import type { BodyChange } from "./body-editor";
import "./inherited-auth-hint";
import "../../components/scripts-editor";
import type { Scripts } from "@shared/models/scripts";
import type { CookiesDialog } from "../cookies/cookies-dialog";
import "../cookies/cookies-dialog";
import { sectionTabsStyles } from "./section-tabs-styles";

/** Params, Headers, Body, Auth and Scripts of the active request. */
export class RequestEditor extends LitElement {
  static override styles = [
    formStyles,
    sectionTabsStyles,
    css`
      .section-tabs .cookies-link {
        align-self: center;
        padding: 4px 8px;
        border: none;
        background: transparent;
        color: var(--color-link);
        font-size: calc(12px * var(--text-scale));
      }
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: auto;
      }
    `,
  ];
  static override properties = { tab: { attribute: false }, workspaceId: { attribute: false } };

  declare tab: RequestTab;
  declare workspaceId: string;

  override render(): TemplateResult {
    const { draft } = this.tab;
    return html`
      <div class="section-tabs" role="tablist" aria-label="Request">
        ${this.renderSectionTab("params", "Params", countEnabled(draft.params) + countEnabled(draft.pathVariables ?? []))}
        ${this.renderSectionTab("auth", "Authorization", draft.auth.type === "inherit" || draft.auth.type === "none" ? 0 : 1)}
        ${this.renderSectionTab("headers", "Headers", countEnabled(draft.headers))}
        ${this.renderSectionTab("body", "Body", draft.body.type === "none" ? 0 : 1)}
        ${this.renderSectionTab("scripts", "Scripts", countScripts(draft.scripts))}
        <span class="spacer"></span>
        <button class="cookies-link" @click=${this.openCookies}>Cookies</button>
      </div>
      <div role="tabpanel">${this.renderSection()}</div>
      <cookies-dialog .workspaceId=${this.workspaceId}></cookies-dialog>
    `;
  }

  private readonly openCookies = (): void => {
    void this.renderRoot.querySelector<CookiesDialog>("cookies-dialog")?.open();
  };

  private renderSectionTab(section: EditorSection, label: string, count: number): TemplateResult {
    const isSelected = this.tab.editorSection === section;
    const countLabel = showsCount(section) && count > 0 ? String(count) : "";
    return html`<button
      role="tab"
      aria-selected=${String(isSelected)}
      @click=${() => {
        updateTab(this.tab.id, { editorSection: section });
      }}
    >
      ${label}<span class="count">${countLabel}</span>
      ${count === 0 ? undefined : html`<span class="has-content" title="${label} is set"></span>`}
    </button>`;
  }

  private renderSection(): TemplateResult {
    switch (this.tab.editorSection) {
      case "params":
      case "headers":
      case "body":
        return this.renderEditableSection(this.tab.editorSection);
      case "auth":
        return this.renderAuth();
      case "scripts":
        return this.renderScripts();
    }
  }

  private renderAuth(): TemplateResult {
    const { id, draft } = this.tab;
    const changeAuth = (auth: RequestAuth): void => {
      updateDraft(id, { auth });
    };
    const hint = html`<inherited-auth-hint
      .workspaceId=${this.workspaceId}
      .itemId=${this.tab.itemId}
    ></inherited-auth-hint>`;
    const collectionId = findTreeItem(this.tab.itemId)?.collectionId ?? null;
    return html`<auth-editor
      .auth=${draft.auth}
      .inheritHint=${hint}
      .collectionId=${collectionId}
      .onChange=${changeAuth}
    ></auth-editor>`;
  }

  private renderScripts(): TemplateResult {
    const { id, draft } = this.tab;
    // Typed in the script editors, which keep their own undo history.
    const change = (scripts: Scripts): void => {
      updateDraft(id, { scripts }, { isUndoable: false });
    };
    return html`<scripts-editor
      .historyKey=${id}
      .scripts=${draft.scripts}
      .onChange=${change}
    ></scripts-editor>`;
  }

  /** Query Params, and Path Variables when the URL has ":name" segments (as in Postman). */
  private renderParams(changeParams: (params: KeyValue[]) => void): TemplateResult {
    const { id, draft } = this.tab;
    const changePathVariables = (pathVariables: KeyValue[]): void => {
      updateDraft(id, { pathVariables });
    };
    return html`<key-value-table
        .rows=${draft.params}
        .title=${"Query Params"}
        .onChange=${changeParams}
      ></key-value-table>
      ${
        draft.pathVariables === undefined || draft.pathVariables.length === 0
          ? undefined
          : html`<key-value-table
              .rows=${draft.pathVariables}
              .title=${"Path Variables"}
              .onChange=${changePathVariables}
            ></key-value-table>`
      }`;
  }

  private renderEditableSection(section: "params" | "headers" | "body"): TemplateResult {
    const { id, draft } = this.tab;
    const changeParams = (params: KeyValue[]): void => {
      updateDraft(id, { params, url: urlWithParams(draft.url, params) });
    };
    const changeHeaders = (headers: KeyValue[]): void => {
      updateDraft(id, { headers });
    };
    const changeBody = ({ isCodeEdit = false, ...change }: BodyChange): void => {
      updateDraft(id, change, { isUndoable: !isCodeEdit });
    };
    if (section === "params") return this.renderParams(changeParams);
    if (section === "headers") {
      return html`<key-value-table
        .rows=${draft.headers}
        .title=${"Headers"}
        .onChange=${changeHeaders}
      ></key-value-table>`;
    }
    return html`<body-editor
      .historyKey=${id}
      .body=${draft.body}
      .otherBodies=${draft.otherBodies ?? []}
      .onChange=${changeBody}
    ></body-editor>`;
  }
}

/** Params and headers show how many are on; every section that is set gets a green dot. */
function showsCount(section: EditorSection): boolean {
  return section === "params" || section === "headers";
}

function countEnabled(rows: readonly KeyValue[]): number {
  return rows.filter((row) => row.isEnabled && row.key !== "").length;
}

customElements.define("request-editor", RequestEditor);

declare global {
  interface HTMLElementTagNameMap {
    "request-editor": RequestEditor;
  }
}

function countScripts(scripts: Scripts | undefined): number {
  if (scripts === undefined) return 0;
  return [scripts.preRequest, scripts.postResponse].filter((text) => text.trim() !== "").length;
}
