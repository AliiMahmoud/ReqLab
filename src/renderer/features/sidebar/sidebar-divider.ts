import { css, LitElement } from "lit";
import { DEFAULT_SIDEBAR_WIDTH, setSidebarWidth, sidebarWidth } from "../../stores/sidebar-width-store";

const KEYBOARD_STEP = 16;

/**
 * The bar between the sidebar and the request area. Drag it to change the sidebar's width;
 * ←/→ resize with the keyboard and a double-click puts back the default width.
 */
export class SidebarDivider extends LitElement {
  static override styles = css`
    :host {
      flex: none;
      width: 7px;
      margin: 0 -3px;
      position: relative;
      z-index: 2;
      cursor: col-resize;
      touch-action: none;
    }
    :host(:hover)::after,
    :host(:focus-visible)::after,
    :host(.is-dragging)::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 2px;
      width: 3px;
      background: var(--color-accent);
    }
    :host(:focus-visible) {
      outline: none;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", "separator");
    this.setAttribute("aria-orientation", "vertical");
    this.setAttribute("aria-label", "Resize the sidebar");
    this.tabIndex = 0;
    this.addEventListener("pointerdown", this.startDrag);
    this.addEventListener("keydown", this.resizeWithKeys);
    this.addEventListener("dblclick", this.resetWidth);
  }

  private readonly startDrag = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth.get();
    this.setPointerCapture(event.pointerId);
    this.classList.add("is-dragging");
    const move = (moveEvent: PointerEvent): void => {
      setSidebarWidth(startWidth + moveEvent.clientX - startX);
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

  private readonly resizeWithKeys = (event: KeyboardEvent): void => {
    const step = { ArrowLeft: -KEYBOARD_STEP, ArrowRight: KEYBOARD_STEP }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    setSidebarWidth(sidebarWidth.get() + step);
  };

  private readonly resetWidth = (): void => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  };
}

customElements.define("sidebar-divider", SidebarDivider);

declare global {
  interface HTMLElementTagNameMap {
    "sidebar-divider": SidebarDivider;
  }
}
