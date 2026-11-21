import { css, html, LitElement, type TemplateResult } from "lit";
import { safeStyle } from "../../directives/safe-style";
import { closeIcon, collectionIcon, macFolderIcon, plusIcon } from "../../components/icons";
import { methodColor } from "../../components/method-colors";
import { formStyles } from "../../components/shared-styles";
import { withShortcut } from "../../components/shortcut-label";
import { watch } from "../../controllers/signal-watcher";
import { hasUnsavedChanges, type RequestTab } from "../../stores/request-tab";
import { activeTabId, closeTab, openDraft, tabs } from "../../stores/tab-store";
import type { ContextMenu } from "../../components/context-menu";
import "../../components/context-menu";
import { tabMenuItems } from "./tab-menu-items";
import { TabDragController } from "./tab-drag";

/**
 * Open requests across the top, as in the design: the active tab has an accent top border.
 * Right-click a tab for Close / Close others / to the left / to the right / Close all; drag tabs to reorder.
 */
export class RequestTabsBar extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        display: flex;
        align-items: stretch;
        height: 46px;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-surface);
        overflow-x: auto;
        /* Still scrolls sideways (trackpad, shift + wheel), just without a visible scrollbar. */
        scrollbar-width: none;
        flex: none;
      }
      :host::-webkit-scrollbar {
        display: none;
      }
      .tablist {
        display: contents;
      }
      /* Rounded tabs, centred in the bar; the active one is underlined in amber. */
      /* The whole tab is clickable, not only its label. */
      .tab {
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin: 5px 0 5px 6px;
        padding: 0 6px 0 12px;
        border: 1px solid transparent;
        border-radius: 9px;
        color: var(--color-text-muted);
        white-space: nowrap;
      }
      /* Reordering: a straight amber bar in the gap where the dragged tab will land. */
      .tab.is-dragging {
        opacity: 0.45;
      }
      .tab.is-drop-before::before,
      .tab.is-drop-after::before {
        content: "";
        position: absolute;
        top: 4px;
        bottom: 4px;
        width: 3px;
        border-radius: 2px;
        background: var(--color-accent);
        pointer-events: none;
      }
      .tab.is-drop-before::before {
        left: -5px;
      }
      .tab.is-drop-after::before {
        right: -5px;
      }
      .tab:hover:not(.is-active) {
        background: var(--color-hover-tint);
      }
      .tab.is-active {
        position: relative;
        background: var(--color-background);
        color: var(--color-text);
      }
      /* A straight amber line, clear of the rounded corners. */
      .tab.is-active::after {
        content: "";
        position: absolute;
        left: 10px;
        right: 10px;
        bottom: 0;
        height: 2px;
        border-radius: 2px;
        background: var(--color-accent);
      }
      .open {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: 0;
        border: none;
        background: transparent;
        color: inherit;
        min-width: 0;
      }
      .open:hover:not(:disabled) {
        background: transparent;
      }
      /* Long names stop at a steady width with "…"; hovering the tab shows the whole name. */
      .name {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .container-icon {
        display: inline-flex;
        color: var(--color-text-muted);
      }
      .method {
        font-family: var(--font-ui);
        font-variant-numeric: tabular-nums;
        font-size: calc(10.5px * var(--text-scale));
      }
      .dirty {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-accent);
      }
      .close,
      .new {
        width: 24px;
        height: 24px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        color: var(--color-text-faint);
      }
      .new {
        margin: auto var(--space-2);
      }
    `,
  ];

  readonly #drag = new TabDragController(this);

  constructor() {
    super();
    watch(this, tabs, activeTabId);
  }

  override render(): TemplateResult {
    return html`
      <div class="tablist" role="tablist" aria-label="Open requests">
        ${tabs.get().map((tab) => this.renderTab(tab))}
      </div>
      <button
        class="new"
        aria-label="New request"
        title=${withShortcut("New request", "Mod+N")}
        @click=${() => {
          openDraft();
        }}
      >
        ${plusIcon()}
      </button>
      <context-menu></context-menu>
    `;
  }

  /** Over the bar but not over a tab (the gaps, the empty end), or out of the bar: no drop marker. */
  private readonly clearHintInGaps = (event: DragEvent): void => {
    const overTab = event
      .composedPath()
      .some((node) => node instanceof HTMLElement && node.classList.contains("tab"));
    if (!overTab) this.#drag.clearHint();
  };

  /** Moves inside the bar report the bar itself (shadow DOM retargeting); only a real exit clears. */
  private readonly clearHintWhenLeaving = (event: DragEvent): void => {
    const target = event.relatedTarget;
    const staysInside =
      target === this || (target instanceof Node && this.shadowRoot?.contains(target) === true);
    if (!staysInside) this.#drag.clearHint();
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("dragover", this.clearHintInGaps);
    this.addEventListener("dragleave", this.clearHintWhenLeaving);
  }

  private openMenu(tabId: string): (event: MouseEvent) => void {
    return (event) => {
      event.preventDefault();
      const menu = this.renderRoot.querySelector<ContextMenu>("context-menu");
      void menu?.open(tabMenuItems(tabId), { x: event.clientX, y: event.clientY });
    };
  }

  private renderTab(tab: RequestTab): TemplateResult {
    const isActive = tab.id === activeTabId.get();
    const select = (): void => {
      activeTabId.set(tab.id);
    };
    const close = (event?: Event): void => {
      event?.stopPropagation(); // the × closes; it must not also select the tab
      void closeTab(tab.id);
    };
    const closeOnMiddleClick = (event: MouseEvent): void => {
      if (event.button === 1) close();
    };
    const drag = this.#drag.handlersFor(tab.id);
    return html`<div
      class="tab ${isActive ? "is-active" : ""} ${this.#drag.classFor(tab.id)}"
      draggable="true"
      @dragstart=${drag.dragstart}
      @dragover=${drag.dragover}
      @dragleave=${drag.dragleave}
      @drop=${drag.drop}
      @dragend=${drag.dragend}
      @click=${select}
      @auxclick=${closeOnMiddleClick}
      @contextmenu=${this.openMenu(tab.id)}
    >
      ${renderTabLabel(tab, isActive, select)}
      <button class="close" aria-label="Close ${tab.name}" @click=${close}>${closeIcon()}</button>
    </div>`;
  }
}

/** Method, name and the unsaved-changes dot; clicking it shows the tab. */
function renderTabLabel(tab: RequestTab, isActive: boolean, select: () => void): TemplateResult {
  const method = tab.draft.method.toUpperCase();
  const badge =
    tab.container === undefined
      ? html`<span class="method" style=${safeStyle({ color: methodColor(method) })}>${method}</span>`
      : html`<span class="container-icon"
          >${tab.container.isCollection ? collectionIcon() : macFolderIcon(14)}</span
        >`;
  return html`<button
    class="open"
    role="tab"
    aria-selected=${String(isActive)}
    title=${tab.name}
    @click=${select}
  >
    ${badge}
    <span class="name">${tab.name}</span>
    ${hasUnsavedChanges(tab) ? html`<span class="dirty" title="Unsaved changes"></span>` : undefined}
  </button>`;
}

customElements.define("request-tabs-bar", RequestTabsBar);

declare global {
  interface HTMLElementTagNameMap {
    "request-tabs-bar": RequestTabsBar;
  }
}
