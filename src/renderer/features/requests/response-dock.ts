import { html, type LitElement, type ReactiveController, type TemplateResult } from "lit";
import { safeStyle } from "../../directives/safe-style";
import { appSettings, setAppSetting, type AppSettings } from "../../stores/app-settings-store";

type Position = AppSettings["responsePosition"];

/** A press must move this far before it becomes a drag, so clicks stay clicks. */
const DRAG_THRESHOLD_PX = 6;
/** The grid of spots: left and right side by side on top, below across the bottom (matches the CSS). */
const TOP_ROW_SHARE = 0.6;

const LABELS: Record<Position, string> = {
  left: "← Response on the left",
  right: "Response on the right →",
  below: "↓ Response below",
};

interface Drag {
  /** The spot under the pointer. */
  target: Position;
  /** The pointer inside the split, for the label that follows it. */
  x: number;
  y: number;
}

/**
 * Drag the response by its title bar to dock it left, right or below the request. While dragging,
 * a grid of spots shows (left and right on top, below under both); the one under the pointer lights
 * up and a label follows the pointer. Dropping sets Settings › Response position; Escape cancels.
 * Buttons in the bar keep working.
 */
export class ResponseDockController implements ReactiveController {
  #drag: Drag | undefined;

  constructor(private readonly host: LitElement) {
    host.addController(this);
  }

  hostConnected(): void {
    this.host.addEventListener("pointerdown", this.start);
  }

  hostDisconnected(): void {
    this.host.removeEventListener("pointerdown", this.start);
  }

  get isDragging(): boolean {
    return this.#drag !== undefined;
  }

  /** Inside the split: the grid of spots with the active one lit, and the label at the pointer. */
  renderPreview(): TemplateResult | undefined {
    const drag = this.#drag;
    if (drag === undefined) return undefined;
    const spots: Position[] = ["left", "right", "below"];
    return html`${spots.map(
        (spot) =>
          html`<div
            class="dock-spot is-${spot} ${drag.target === spot ? "is-active" : ""}"
            aria-hidden="true"
          >
            ${drag.target === spot ? LABELS[spot] : undefined}
          </div>`,
      )}
      <div class="dock-label" style=${safeStyle({ left: `${String(drag.x)}px`, top: `${String(drag.y)}px` })}>
        ${LABELS[drag.target]}
      </div>`;
  }

  private readonly start = (down: PointerEvent): void => {
    const split = this.host.renderRoot.querySelector(".split");
    if (down.button !== 0 || split === null || !isOnResponseBar(down)) return;
    down.preventDefault();
    const listening = listenWhileDragging({
      move: (event) => {
        this.follow(split, down, event);
      },
      end: (shouldDrop) => {
        listening.stop();
        this.finish(shouldDrop);
      },
    });
  };

  /** Starts once the pointer has moved a little; then tracks the spot under it. */
  private follow(split: Element, down: PointerEvent, event: PointerEvent): void {
    const distance = Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY);
    if (this.#drag === undefined && distance < DRAG_THRESHOLD_PX) return;
    const bounds = split.getBoundingClientRect();
    this.update({
      target: spotAt(bounds, event),
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  /** Dropped on a spot: the response moves there (Settings › Response position follows). */
  private finish(shouldDrop: boolean): void {
    const target = this.#drag?.target;
    this.update(undefined);
    if (shouldDrop && target !== undefined && target !== appSettings.get().responsePosition) {
      setAppSetting("responsePosition", target);
    }
  }

  private update(drag: Drag | undefined): void {
    this.#drag = drag;
    // A closed hand wherever the pointer goes while dragging.
    document.body.style.cursor = drag === undefined ? "" : "grabbing";
    this.host.requestUpdate();
  }
}

/** Pointer moves, then the release (drop) or a cancel: pointercancel, or Escape. */
function listenWhileDragging(on: {
  move: (event: PointerEvent) => void;
  end: (shouldDrop: boolean) => void;
}): { stop: () => void } {
  const drop = (): void => {
    on.end(true);
  };
  const cancel = (): void => {
    on.end(false);
  };
  const cancelOnEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    cancel();
  };
  window.addEventListener("pointermove", on.move);
  window.addEventListener("pointerup", drop);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", cancelOnEscape, true);
  return {
    stop: () => {
      window.removeEventListener("pointermove", on.move);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", cancelOnEscape, true);
    },
  };
}

/** On the response's title bar, but not on one of its buttons. */
function isOnResponseBar(event: PointerEvent): boolean {
  const path = event.composedPath().filter((target): target is Element => target instanceof Element);
  const isButton = path.some((element) => element.tagName === "BUTTON" || element.tagName === "INPUT");
  const isBar = path.some((element) => element.classList.contains("status-line"));
  const isResponse = path.some((element) => element.tagName === "RESPONSE-PANEL");
  return isResponse && isBar && !isButton;
}

/** The grid: the bottom row is "below"; above it, the left half is "left" and the right half "right". */
function spotAt(bounds: DOMRect, event: PointerEvent): Position {
  const x = (event.clientX - bounds.left) / bounds.width;
  const y = (event.clientY - bounds.top) / bounds.height;
  if (y > TOP_ROW_SHARE) return "below";
  return x < 0.5 ? "left" : "right";
}
