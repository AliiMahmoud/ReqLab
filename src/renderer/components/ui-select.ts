import { html, LitElement, type TemplateResult } from "lit";
import { safeStyle } from "../directives/safe-style";
import { checkIcon, chevronDownIcon } from "./icons";
import { uiSelectStyles } from "./ui-select-styles";

export interface SelectOption {
  value: string;
  label: string;
  /** Text colour, e.g. a method's colour. */
  color?: string;
  /** A small coloured dot before the label, e.g. an environment's colour tag. */
  dot?: string;
  /** Draws a divider above this option (e.g. before an action such as "+ New environment"). */
  startsGroup?: boolean;
  /** A small icon button at the row's right end that does something else than choosing the row. */
  action?: { label: string; icon: TemplateResult; run: () => void };
}

/**
 * The app's one dropdown (no native <select>). A button opens a listbox in the top layer.
 * Keyboard: ↑/↓ move, Home/End jump, a letter jumps to the next match, Enter/Space picks, Escape closes.
 */
export class UiSelect extends LitElement {
  static override styles = uiSelectStyles;
  static override properties = {
    options: { attribute: false },
    value: { attribute: false },
    label: { attribute: false },
    onChange: { attribute: false },
    triggerAction: { attribute: false },
    isOpen: { state: true },
    highlighted: { state: true },
  };

  declare options: SelectOption[];
  declare value: string;
  /** The accessible name, e.g. "Body type". */
  declare label: string;
  declare onChange: (value: string) => void;
  /** A small icon button inside the closed dropdown, at its end after the arrow (e.g. "Manage environments"). */
  declare triggerAction: SelectOption["action"];
  declare isOpen: boolean;
  declare highlighted: number;

  constructor() {
    super();
    this.options = [];
    this.value = "";
    this.label = "";
    this.onChange = () => undefined;
    this.isOpen = false;
    this.highlighted = 0;
  }

  override render(): TemplateResult {
    const selected = this.options.find((option) => option.value === this.value);
    return html`
      <button
        part="trigger"
        class="trigger"
        popovertarget="options"
        aria-haspopup="listbox"
        aria-expanded=${String(this.isOpen)}
        aria-label=${`${this.label}: ${selected?.label ?? ""}`}
        style=${safeStyle({ color: selected?.color })}
        @keydown=${this.handleTriggerKey}
      >
        ${renderDot(selected?.dot)}<span class="label">${selected?.label ?? ""}</span
        ><span class="chevron">${chevronDownIcon()}</span
        >${this.triggerAction === undefined ? undefined : html`<span class="action-room"></span>`}
      </button>
      ${this.renderTriggerAction()}
      <div id="options" popover="auto" @beforetoggle=${this.prepareToOpen} @toggle=${this.syncOpenState}>
        <ul role="listbox" tabindex="-1" aria-label=${this.label} @keydown=${this.handleListKey}>
          ${this.options.map((option, index) => this.renderOption(option, index))}
        </ul>
      </div>
    `;
  }

  /** Drawn over the trigger, in the room kept for it (a button cannot hold another button). */
  private renderTriggerAction(): TemplateResult | undefined {
    const action = this.triggerAction;
    if (action === undefined) return undefined;
    return html`<button
      class="trigger-action"
      aria-label=${action.label}
      title=${action.label}
      @click=${action.run}
    >
      ${action.icon}
    </button>`;
  }

  private renderOption(option: SelectOption, index: number): TemplateResult {
    const choose = (): void => {
      this.choose(option.value);
    };
    const highlight = (): void => {
      this.highlighted = index;
    };
    return html`<li
      part="option"
      role="option"
      aria-selected=${String(option.value === this.value)}
      class="${index === this.highlighted ? "is-highlighted" : ""} ${option.startsGroup === true ? "starts-group" : ""}"
      style=${safeStyle({ color: option.color })}
      @click=${choose}
      @pointerenter=${highlight}
    >
      ${renderDot(option.dot)}<span class="name">${option.label}</span
      ><span class="check">${checkIcon()}</span>${this.renderAction(option)}
    </li>`;
  }

  private renderAction(option: SelectOption): TemplateResult | undefined {
    const action = option.action;
    if (action === undefined) return undefined;
    const run = (event: Event): void => {
      event.stopPropagation();
      this.close(false);
      action.run();
    };
    return html`<button class="row-action" aria-label=${action.label} title=${action.label} @click=${run}>
      ${action.icon}
    </button>`;
  }

  private open(): void {
    this.popup()?.showPopover();
  }

  private close(returnFocus: boolean): void {
    this.popup()?.hidePopover();
    if (returnFocus) this.renderRoot.querySelector<HTMLElement>(".trigger")?.focus();
  }

  private choose(value: string): void {
    this.close(true);
    if (value !== this.value) this.onChange(value);
  }

  private popup(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>("[popover]");
  }

  /** Runs however the list opens (click via popovertarget, or the keyboard): place it and mark the value. */
  private readonly prepareToOpen = (event: Event): void => {
    const popup = this.popup();
    const trigger = this.renderRoot.querySelector<HTMLElement>(".trigger");
    if ((event as ToggleEvent).newState !== "open" || popup === null || trigger === null) return;
    this.highlighted = Math.max(
      0,
      this.options.findIndex((option) => option.value === this.value),
    );
    placeBelow(popup, trigger.getBoundingClientRect());
  };

  /** The popover also closes itself (outside click, Escape); keep the state in step. */
  private readonly syncOpenState = (event: Event): void => {
    this.isOpen = (event as ToggleEvent).newState === "open";
    if (this.isOpen) this.renderRoot.querySelector<HTMLElement>("ul")?.focus();
  };

  private readonly handleTriggerKey = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    this.open();
  };

  private readonly handleListKey = (event: KeyboardEvent): void => {
    const next = this.nextHighlight(event.key);
    if (next !== undefined) this.highlighted = next;
    else if (event.key === "Enter" || event.key === " ")
      this.choose(this.options[this.highlighted]?.value ?? this.value);
    else if (event.key === "Tab") this.close(false);
    else return;
    event.preventDefault();
  };

  private nextHighlight(key: string): number | undefined {
    const last = this.options.length - 1;
    if (key === "ArrowDown") return Math.min(last, this.highlighted + 1);
    if (key === "ArrowUp") return Math.max(0, this.highlighted - 1);
    if (key === "Home") return 0;
    if (key === "End") return last;
    return key.length === 1 ? this.findByLetter(key.toLowerCase()) : undefined;
  }

  /** Type-ahead: the next option after the current one whose label starts with the letter. */
  private findByLetter(letter: string): number | undefined {
    const count = this.options.length;
    for (let step = 1; step <= count; step += 1) {
      const index = (this.highlighted + step) % count;
      if (this.options[index]?.label.toLowerCase().startsWith(letter) === true) return index;
    }
    return undefined;
  }
}

/** Under the trigger, at least as wide as it; flipped above when there is no room below. */
function placeBelow(popup: HTMLElement, anchor: DOMRect): void {
  const spaceBelow = window.innerHeight - anchor.bottom;
  popup.style.minWidth = `${String(Math.max(anchor.width, 140))}px`;
  popup.style.left = `${String(Math.min(anchor.left, window.innerWidth - 160))}px`;
  if (spaceBelow < 200 && anchor.top > spaceBelow) {
    popup.style.top = "";
    popup.style.bottom = `${String(window.innerHeight - anchor.top + 6)}px`;
  } else {
    popup.style.bottom = "";
    popup.style.top = `${String(anchor.bottom + 6)}px`;
  }
}

function renderDot(color: string | undefined): TemplateResult | undefined {
  if (color === undefined) return undefined;
  // "none" draws an empty ring, e.g. an environment without a colour tag.
  if (color === "none") return html`<span class="dot is-empty" aria-hidden="true"></span>`;
  return html`<span class="dot" style=${safeStyle({ background: color })} aria-hidden="true"></span>`;
}

customElements.define("ui-select", UiSelect);

declare global {
  interface HTMLElementTagNameMap {
    "ui-select": UiSelect;
  }
}
