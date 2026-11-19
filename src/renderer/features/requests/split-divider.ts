import { css, html, LitElement, type TemplateResult } from "lit";
import { watch } from "../../controllers/signal-watcher";
import {
  isResponseCollapsed,
  requestShare,
  setRequestShare,
  toggleResponse,
} from "../../stores/layout-store";

const KEYBOARD_STEP = 0.05;

/**
 * The bar between the request (above) and the response (below). Drag it to change their heights;
 * with the keyboard, ↑/↓ resize and Enter collapses or expands the response.
 */
export class SplitDivider extends LitElement {
  static override styles = css`
    :host {
      display: block;
      flex: none;
      height: 7px;
      margin: -3px 0;
      position: relative;
      z-index: 2;
      cursor: row-resize;
      touch-action: none;
    }
    :host::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: 3px;
      height: 1px;
      background: var(--color-border);
    }
    :host(:hover)::after,
    :host(:focus-visible)::after,
    :host(.is-dragging)::after {
      top: 2px;
      height: 3px;
      background: var(--color-accent);
    }
    :host(:focus-visible) {
      outline: none;
    }
  `;

  constructor() {
    super();
    watch(this, requestShare, isResponseCollapsed);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", "separator");
    this.setAttribute("aria-orientation", "horizontal");
    this.setAttribute("aria-label", "Resize request and response");
    this.tabIndex = 0;
    this.addEventListener("pointerdown", this.startDrag);
    this.addEventListener("keydown", this.handleKey);
    this.addEventListener("dblclick", toggleResponse);
  }

  override render(): TemplateResult {
    this.setAttribute("aria-valuenow", String(Math.round(requestShare.get() * 100)));
    this.setAttribute("aria-valuemin", "15");
    this.setAttribute("aria-valuemax", "85");
    return html``;
  }

  private readonly startDrag = (event: PointerEvent): void => {
    const area = this.parentElement;
    if (area === null || event.button !== 0) return;
    event.preventDefault();
    this.setPointerCapture(event.pointerId);
    this.classList.add("is-dragging");
    const bounds = area.getBoundingClientRect();
    const move = (moveEvent: PointerEvent): void => {
      if (isResponseCollapsed.get()) toggleResponse();
      setRequestShare((moveEvent.clientY - bounds.top) / bounds.height);
    };
    const stop = (): void => {
      this.classList.remove("is-dragging");
      this.removeEventListener("pointermove", move);
      this.removeEventListener("pointerup", stop);
      this.removeEventListener("pointercancel", stop);
    };
    this.addEventListener("pointermove", move);
    this.addEventListener("pointerup", stop);
    this.addEventListener("pointercancel", stop);
  };

  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key === "ArrowUp") setRequestShare(requestShare.get() - KEYBOARD_STEP);
    else if (event.key === "ArrowDown") setRequestShare(requestShare.get() + KEYBOARD_STEP);
    else if (event.key === "Enter") toggleResponse();
    else return;
    event.preventDefault();
  };
}

customElements.define("split-divider", SplitDivider);

declare global {
  interface HTMLElementTagNameMap {
    "split-divider": SplitDivider;
  }
}
