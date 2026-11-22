import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import type { WorkspaceSummary } from "@shared/models/workspace";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { loadCollectionTree } from "../../stores/collection-store";
import { activeEnvironmentId, loadEnvironments } from "../../stores/environment-store";
import { loadHistory } from "../../stores/history-store";
import { loadNetworkSettings } from "../../stores/network-store";
import { notice } from "../../stores/notice-store";
import { activeTabId, persistTabs, restoreTabs, tabs } from "../../stores/tab-store";
import { mainView } from "../../stores/view-store";
import "../environments/environments-page";
import "../requests/request-area";
import "../sidebar/workspace-sidebar";
import "../sidebar/sidebar-divider";
import { safeStyle } from "../../directives/safe-style";
import { isSidebarHidden, sidebarWidth } from "../../stores/sidebar-width-store";
import { renderSidebarToggle, sidebarToggleStyles } from "../sidebar/sidebar-toggle";
import "../workspace/app-header";

/** Short, so little is lost if the app quits or auto-locks right after an edit. */
const PERSIST_DELAY_MS = 300;

/** An open workspace: header, then either the request view (sidebar + tabs) or the environments page. */
export class WorkspaceHome extends LitElement {
  static override styles = [
    formStyles,
    sidebarToggleStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      }
      .body {
        flex: 1;
        display: flex;
        min-height: 0;
      }
      /* Lays its children out as if they were the body's own. */
      .requests {
        display: contents;
      }
      .requests[hidden] {
        display: none;
      }
      .toast {
        position: fixed;
        bottom: var(--space-4);
        left: 50%;
        transform: translateX(-50%);
        max-width: min(560px, calc(100% - 32px));
        padding: var(--space-2) var(--space-4);
        border-radius: var(--radius);
        border: 1px solid var(--color-border);
        background: var(--color-selected);
      }
      .toast.is-error {
        color: var(--color-danger);
        border-color: var(--color-danger);
      }
    `,
  ];
  static override properties = { workspace: { attribute: false } };

  declare workspace: WorkspaceSummary;
  #persistTimer: ReturnType<typeof setTimeout> | undefined;
  readonly #stopWatchingTabs: (() => void)[] = [];

  constructor() {
    super();
    watch(this, mainView, notice, sidebarWidth, isSidebarHidden);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const schedulePersist = (): void => {
      this.schedulePersist();
    };
    window.addEventListener("pagehide", this.persistNow);
    this.#stopWatchingTabs.push(
      tabs.subscribe(schedulePersist),
      activeTabId.subscribe(schedulePersist),
      activeEnvironmentId.subscribe(schedulePersist),
    );
  }

  override disconnectedCallback(): void {
    window.removeEventListener("pagehide", this.persistNow);
    for (const stop of this.#stopWatchingTabs.splice(0)) stop();
    clearTimeout(this.#persistTimer);
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    const previous = changed.get("workspace");
    if (!changed.has("workspace") || previous?.id === this.workspace.id) return;
    // A save still pending belongs to the previous workspace; the switch already saved it.
    clearTimeout(this.#persistTimer);
    void this.loadWorkspace();
  }

  override render(): TemplateResult {
    const message = notice.get();
    const isEnvironments = mainView.get() === "environments";
    // The requests stay in the page (hidden) while Environments is open, so their editors keep
    // their undo history and scroll position.
    return html`
      <app-header .workspace=${this.workspace}></app-header>
      <div class="body">
        <div class="requests" ?hidden=${isEnvironments}>
          ${this.renderSidebar()} <request-area .workspaceId=${this.workspace.id}></request-area>
        </div>
        ${isEnvironments ? html`<environments-page .workspaceId=${this.workspace.id}></environments-page>` : undefined}
      </div>
      ${
        message === undefined
          ? undefined
          : html`<p class="toast ${message.isError ? "is-error" : ""}" role="status">${message.text}</p>`
      }
    `;
  }

  /** The left panel and its divider, or (hidden) a thin strip with the button that shows it. */
  private renderSidebar(): TemplateResult {
    if (isSidebarHidden.get()) return html`<div class="sidebar-rail">${renderSidebarToggle()}</div>`;
    return html`<workspace-sidebar
        .workspaceId=${this.workspace.id}
        style=${safeStyle({ flexBasis: `${String(sidebarWidth.get())}px` })}
      ></workspace-sidebar>
      <sidebar-divider></sidebar-divider>`;
  }

  private async loadWorkspace(): Promise<void> {
    const workspaceId = this.workspace.id;
    mainView.set("requests");
    await Promise.all([
      loadCollectionTree(workspaceId),
      loadEnvironments(workspaceId),
      loadHistory(workspaceId),
      loadNetworkSettings(workspaceId),
    ]);
    await restoreTabs(workspaceId);
  }

  /** Closing the window: save right away instead of waiting for the timer. */
  private readonly persistNow = (): void => {
    clearTimeout(this.#persistTimer);
    void persistTabs(this.workspace.id);
  };

  private schedulePersist(): void {
    clearTimeout(this.#persistTimer);
    const workspaceId = this.workspace.id;
    this.#persistTimer = setTimeout(() => void persistTabs(workspaceId), PERSIST_DELAY_MS);
  }
}

customElements.define("workspace-home", WorkspaceHome);

declare global {
  interface HTMLElementTagNameMap {
    "workspace-home": WorkspaceHome;
  }
}
