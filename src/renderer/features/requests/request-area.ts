import { css, html, LitElement, type TemplateResult } from "lit";
import { safeStyle } from "../../directives/safe-style";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { findTreeItem, loadCollectionTree } from "../../stores/collection-store";
import { activeEnvironmentId, refreshVariableNames } from "../../stores/environment-store";
import { cancelTab, copyTabAsCurl, sendTab } from "../../stores/request-runner";
import {
  activeTabId,
  findTab,
  getActiveTab,
  handleSaveBeforeClosing,
  saveTab,
  tabs,
} from "../../stores/tab-store";
import "../responses/response-panel";
import "./empty-request-area";
import "./request-editor";
import "./request-title";
import "./split-divider";
import { isResponseCollapsed, requestShare } from "../../stores/layout-store";
import { hasUnsavedChanges, type RequestTab } from "../../stores/request-tab";
import "./request-tabs-bar";
import "../containers/container-settings-view";
import type { SaveRequestDialog } from "./save-request-dialog";
import "./save-request-dialog";
import "./url-bar";
import { isRequestCommand, REQUEST_COMMAND_EVENT } from "./request-commands";

/** The main column: open tabs, then the URL bar and the request / response split. */
export class RequestArea extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      /* Request on top, response below, a draggable divider between them. */
      .split {
        flex: 1;
        display: flex;
        flex-direction: column;
        border-top: 1px solid var(--color-border);
        min-height: 0;
      }
      request-editor {
        flex: none;
        min-height: 80px;
        overflow: auto;
      }
      response-panel {
        flex: 1;
        min-height: 41px;
      }
      .split.is-collapsed request-editor {
        flex: 1;
      }
      .split.is-collapsed response-panel {
        flex: none;
      }
    `,
  ];
  static override properties = { workspaceId: { attribute: false } };

  declare workspaceId: string;
  #lastNamesKey = "";

  constructor() {
    super();
    watch(this, tabs, activeTabId, activeEnvironmentId, requestShare, isResponseCollapsed);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(REQUEST_COMMAND_EVENT, this.runCommand);
    this.addEventListener("send-request", this.send);
    this.addEventListener("cancel-request", this.cancel);
    this.addEventListener("save-request", this.save);
    this.addEventListener("copy-curl", this.copyCurl);
    handleSaveBeforeClosing(this.saveBeforeClosing);
  }

  override disconnectedCallback(): void {
    window.removeEventListener(REQUEST_COMMAND_EVENT, this.runCommand);
    super.disconnectedCallback();
  }

  override render(): TemplateResult {
    const tab = getActiveTab();
    this.refreshNamesIfContextChanged(tab?.itemId ?? null);
    return html`<request-tabs-bar></request-tabs-bar>${this.renderContent(tab)}
      <save-request-dialog .workspaceId=${this.workspaceId}></save-request-dialog>`;
  }

  /** The empty state, a collection / folder settings tab, or a request. */
  private renderContent(tab: RequestTab | undefined): TemplateResult {
    if (tab === undefined) return html`<empty-request-area></empty-request-area>`;
    if (tab.container !== undefined)
      return html`<container-settings-view
        .workspaceId=${this.workspaceId}
        .tab=${tab}
      ></container-settings-view>`;
    return html`<request-title .tab=${tab} .workspaceId=${this.workspaceId}></request-title>
      <url-bar .tab=${tab}></url-bar> ${this.renderSplit(tab)}`;
  }

  private renderSplit(tab: RequestTab): TemplateResult {
    const isCollapsed = isResponseCollapsed.get();
    const height = isCollapsed ? {} : { height: `${String(requestShare.get() * 100)}%` };
    return html`<div class="split ${isCollapsed ? "is-collapsed" : ""}">
      <request-editor
        .tab=${tab}
        .workspaceId=${this.workspaceId}
        style=${safeStyle(height)}
      ></request-editor>
      <split-divider></split-divider>
      <response-panel .tab=${tab}></response-panel>
    </div>`;
  }

  /** Variable names depend on the environment and on the request's collection. */
  private refreshNamesIfContextChanged(itemId: string | null): void {
    const collectionId = findTreeItem(itemId)?.collectionId ?? null;
    const key = `${activeEnvironmentId.get() ?? ""}|${collectionId ?? ""}`;
    if (key === this.#lastNamesKey) return;
    this.#lastNamesKey = key;
    void refreshVariableNames(this.workspaceId, collectionId);
  }

  /** Cmd/Ctrl+Enter and Cmd/Ctrl+S from the application menu: they work wherever focus is. */
  private readonly runCommand = (event: Event): void => {
    // A settings tab has nothing to send, and saves itself.
    if (!isRequestCommand(event) || getActiveTab()?.container !== undefined) return;
    if (event.detail === "send") this.sendOrCancel();
    else this.save();
  };

  private readonly send = (): void => {
    const tab = getActiveTab();
    if (tab !== undefined) void sendTab(this.workspaceId, tab.id);
  };

  /** The shortcut sends, or cancels the request already on its way (like pressing Cancel). */
  private sendOrCancel(): void {
    if (getActiveTab()?.sendingRequestId === undefined) this.send();
    else this.cancel();
  }

  private readonly cancel = (): void => {
    const tab = getActiveTab();
    if (tab !== undefined) void cancelTab(tab.id);
  };

  private readonly copyCurl = (): void => {
    const tab = getActiveTab();
    if (tab !== undefined) void copyTabAsCurl(this.workspaceId, tab.id);
  };

  /** "Save changes" while closing: a saved request saves in place; a draft asks where to save it. */
  private readonly saveBeforeClosing = async (tabId: string): Promise<boolean> => {
    const tab = findTab(tabId);
    if (tab === undefined) return false;
    if (tab.itemId === null) {
      activeTabId.set(tabId);
      const dialog = this.renderRoot.querySelector<SaveRequestDialog>("save-request-dialog");
      return dialog === null ? false : dialog.open(tabId, tab.name);
    }
    await saveTab(this.workspaceId, tabId);
    await loadCollectionTree(this.workspaceId);
    const saved = findTab(tabId);
    return saved !== undefined && !hasUnsavedChanges(saved);
  };

  private readonly save = (): void => {
    const tab = getActiveTab();
    if (tab === undefined) return;
    if (tab.itemId === null) {
      void this.renderRoot.querySelector<SaveRequestDialog>("save-request-dialog")?.open(tab.id, tab.name);
      return;
    }
    void saveTab(this.workspaceId, tab.id).then(() => loadCollectionTree(this.workspaceId));
  };
}

customElements.define("request-area", RequestArea);

declare global {
  interface HTMLElementTagNameMap {
    "request-area": RequestArea;
  }
}
