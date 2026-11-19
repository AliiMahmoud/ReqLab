import { insertVariable, offsetOfIndex, openVariableAtCaret, tokenAtPoint } from "./variable-text";
import { VariablePopover } from "./variable-popover";

const HOVER_DELAY_MS = 350;
const LEAVE_GRACE_MS = 300;

/**
 * Postman-style help for {{variables}} in every text field marked with `data-variables`:
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
}

function variableField(event: Event): HTMLInputElement | undefined {
  const target = event.composedPath()[0];
  return target instanceof HTMLInputElement && target.dataset["variables"] !== undefined ? target : undefined;
}

class VariableAssist {
  #suggestingIn: HTMLInputElement | undefined;
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
    const top = input.getBoundingClientRect().bottom + 4;
    this.popover.showAt("suggest", { left: offsetOfIndex(input, open.start), top });
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
    const token = input === undefined ? undefined : tokenAtPoint(input, event.clientX);
    clearTimeout(this.#hoverTimer);
    if (input === undefined || token === undefined) {
      this.leaveCardSoon();
      return;
    }
    this.cancelLeave();
    if (this.popover.mode === "details" && this.popover.detailName === token.name) return;
    this.#hoverTimer = setTimeout(() => {
      this.popover.detailName = token.name;
      const left = offsetOfIndex(input, token.start);
      this.popover.showAt("details", { left, top: input.getBoundingClientRect().bottom + 4 });
    }, HOVER_DELAY_MS);
  }

  /** A click outside the card closes it. */
  onPointerDown(event: PointerEvent): void {
    if (this.popover.mode === "details" && !event.composedPath().includes(this.popover)) this.popover.hide();
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

  private closeSuggestions(): void {
    this.#suggestingIn = undefined;
    if (this.popover.mode === "suggest") this.popover.hide();
  }
}
