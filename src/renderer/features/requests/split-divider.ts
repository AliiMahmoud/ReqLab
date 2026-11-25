import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import type { AppSettings } from "../../stores/app-settings-store";
import { watch } from "../../controllers/signal-watcher";
import {
  isResponseCollapsed,
  requestShare,
  setRequestShare,
  toggleResponseCollapsed,
} from "../../stores/layout-store";

const KEYBOARD_STEP = 0.05;

type Position = AppSettings["responsePosition"];

/**
 * The bar between the request and the response (below it, or beside it: Settings › Response
 * position). Drag it to share the space; with the keyboard, the arrows resize and Enter collapses
 * or expands the response.
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
    /* Side by side: a vertical bar. */
    :host([vertical]) {
      height: auto;
      width: 7px;
      margin: 0 -3px;
      cursor: col-resize;
    }
    :host([vertical])::after {
      left: 3px;
      right: auto;
      top: 0;
      bottom: 0;
      width: 1px;
      height: auto;
    }
    :host([vertical]:hover)::after,
    :host([vertical]:focus-visible)::after,
    :host([vertical].is-dragging)::after {
      left: 2px;
      top: 0;
      width: 3px;
      height: auto;
    }
  `;
  static override properties = { position: { attribute: false } };

  /** Where the response is; decides the bar's direction. */
  declare position: Position;

  constructor() {
    super();
    this.position = "below";
    watch(this, requestShare, isResponseCollapsed);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has("position")) return;
    const isVertical = this.position !== "below";
    this.toggleAttribute("vertical", isVertical);
    // A vertical bar separates side-by-side panes (ARIA's orientation is the bar's own direction).
    this.setAttribute("aria-orientation", isVertical ? "vertical" : "horizontal");
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", "separator");
    this.setAttribute("aria-label", "Resize request and response");
    this.tabIndex = 0;
    this.addEventListener("pointerdown", this.startDrag);
    this.addEventListener("keydown", this.handleKey);
    this.addEventListener("dblclick", toggleResponseCollapsed);
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
      if (isResponseCollapsed.get()) toggleResponseCollapsed();
      setRequestShare(shareAt(this.position, bounds, moveEvent));
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
    const step = keyStep(this.position, event.key);
    if (step !== 0) setRequestShare(requestShare.get() + step);
    else if (event.key === "Enter") toggleResponseCollapsed();
    else return;
    event.preventDefault();
  };
}

/** The request's share of the split at the pointer: from the top, the left, or (response left) the right. */
function shareAt(position: Position, bounds: DOMRect, event: PointerEvent): number {
  if (position === "below") return (event.clientY - bounds.top) / bounds.height;
  if (position === "right") return (event.clientX - bounds.left) / bounds.width;
  return (bounds.right - event.clientX) / bounds.width;
}

/** How much an arrow key grows (+) or shrinks (−) the request, moving the bar the arrow's way. */
function keyStep(position: Position, key: string): number {
  const toward: Record<Position, Record<string, number>> = {
    below: { ArrowUp: -1, ArrowDown: 1 },
    right: { ArrowLeft: -1, ArrowRight: 1 },
    left: { ArrowLeft: 1, ArrowRight: -1 },
  };
  return (toward[position][key] ?? 0) * KEYBOARD_STEP;
}

customElements.define("split-divider", SplitDivider);

declare global {
  interface HTMLElementTagNameMap {
    "split-divider": SplitDivider;
  }
}
