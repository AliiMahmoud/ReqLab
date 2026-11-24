import { activeTabId } from "../../stores/tab-store";
import { mainView } from "../../stores/view-store";
import { caretPoint, popoverTop, type TextField } from "./field-geometry";
import { insertVariable, openVariableAtCaret, tokenAtPoint } from "./variable-text";
import { VariablePopover } from "./variable-popover";

const HOVER_DELAY_MS = 350;
const LEAVE_GRACE_MS = 300;

/**
 * Postman-style help for {{variables}} in every input or text box marked with `data-variables`:
 * typing "{{" suggests names, and hovering a {{name}} shows its value with an editor.
 * Events are read through shadow roots with composedPath(), so fields need no wiring of their own.
 */
export function installVariableAssist(): void {
  const popover = new VariablePopover();
  document.body.append(popover);
  const assist = new VariableAssist(popover);
  const listen = <K extends keyof DocumentEventMap>(
    name: K,
    handle: (event: DocumentEventMap[K]) => void,
  ): void => {
    document.addEventListener(name, handle, { capture: true, passive: name === "mousemove" });
  };
  listen("input", (event) => {
    assist.onInput(event);
  });
  listen("keydown", (event) => {
    assist.onKeyDown(event);
  });
  listen("focusout", (event) => {
    assist.onFocusOut(event);
  });
  listen("mousemove", (event) => {
    assist.onMouseMove(event);
  });
  listen("pointerdown", (event) => {
    assist.onPointerDown(event);
  });
  closeOnContextChange(assist);
}

/** Another request, tab or page: what was suggested or shown belongs to the old one. */
function closeOnContextChange(assist: VariableAssist): void {
  const close = (): void => {
    assist.closeAll();
  };
  activeTabId.subscribe(close);
  mainView.subscribe(close);
}

function variableField(event: Event): TextField | undefined {
  const target = event.composedPath()[0];
  const isField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  return isField && target.dataset["variables"] !== undefined ? target : undefined;
}

class VariableAssist {
  #suggestingIn: TextField | undefined;
  #hoverTimer: ReturnType<typeof setTimeout> | undefined;
  #leaveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly popover: VariablePopover) {}

  onInput(event: Event): void {
    const input = variableField(event);
    if (input === undefined) return;
    const open = openVariableAtCaret(input);
    if (open === undefined) {
      this.closeSuggestions();
      return;
    }
    this.#suggestingIn = input;
    this.popover.prefix = open.prefix;
    this.popover.selected = 0;
    this.popover.onPick = (name) => {
      insertVariable(input, open.start, name);
      this.closeSuggestions();
    };
    const caret = caretPoint(input, open.start);
    this.popover.showAt("suggest", { left: caret.left, top: popoverTop(input, caret.bottom) });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.#suggestingIn === undefined || variableField(event) !== this.#suggestingIn) return;
    if (event.key === "Escape") {
      this.closeSuggestions();
    } else if (!this.popover.handleKey(event.key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  onFocusOut(event: FocusEvent): void {
    if (this.#suggestingIn !== undefined && variableField(event) === this.#suggestingIn)
      this.closeSuggestions();
  }

  onMouseMove(event: MouseEvent): void {
    if (this.#suggestingIn !== undefined) return;
    if (event.composedPath().includes(this.popover)) {
      this.cancelLeave();
      return;
    }
    const input = variableField(event);
    const token =
      input === undefined ? undefined : tokenAtPoint(input, { x: event.clientX, y: event.clientY });
    clearTimeout(this.#hoverTimer);
    if (input === undefined || token === undefined) {
      this.leaveCardSoon();
      return;
    }
    this.cancelLeave();
    if (this.popover.mode === "details" && this.popover.detailName === token.name) return;
    this.#hoverTimer = setTimeout(() => {
      this.popover.detailName = token.name;
      const at = caretPoint(input, token.start);
      this.popover.showAt("details", { left: at.left, top: popoverTop(input, at.bottom) });
    }, HOVER_DELAY_MS);
  }

  /** A click outside the card closes it. */
  onPointerDown(event: PointerEvent): void {
    const path = event.composedPath();
    if (path.includes(this.popover)) return;
    if (this.popover.mode === "details") this.popover.hide();
    // Suggestions stay only while pressing inside the field they belong to.
    if (this.#suggestingIn !== undefined && !path.includes(this.#suggestingIn)) this.closeSuggestions();
  }

  /** The card stays while it is being edited (focus inside), else it goes shortly after the mouse leaves. */
  private leaveCardSoon(): void {
    if (this.popover.mode !== "details" || this.#leaveTimer !== undefined) return;
    this.#leaveTimer = setTimeout(() => {
      this.#leaveTimer = undefined;
      if (this.popover.mode === "details" && !this.popover.matches(":focus-within")) this.popover.hide();
    }, LEAVE_GRACE_MS);
  }

  private cancelLeave(): void {
    clearTimeout(this.#leaveTimer);
    this.#leaveTimer = undefined;
  }

  /** Hides the suggestions and the variable card. */
  closeAll(): void {
    this.closeSuggestions();
    this.cancelLeave();
    clearTimeout(this.#hoverTimer);
    this.popover.hide();
  }

  private closeSuggestions(): void {
    this.#suggestingIn = undefined;
    if (this.popover.mode === "suggest") this.popover.hide();
  }
}
