import { css, html, LitElement, type TemplateResult } from "lit";

const MAX_SHOWN = 8;
const KEY_STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

/**
 * A small list of suggestions under a text field (e.g. header names), in the top layer so no
 * panel clips it. Matches starting with the typed text come first, then those containing it; the
 * matched part is bold. ↑/↓ move, Enter or Tab picks, a click picks, Esc closes.
 */
export class SuggestionList extends LitElement {
  static override styles = css`
    :host {
      position: fixed;
      inset: auto;
      margin: 0;
      padding: 4px;
      min-width: 220px;
      max-width: 420px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-raised);
      color: var(--color-text);
      box-shadow: var(--shadow-popup);
      font-family: var(--font-code);
      font-size: calc(12px * var(--text-scale));
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    li.is-selected {
      background: var(--color-hover-tint);
    }
    b {
      color: var(--color-accent);
      font-weight: 600;
    }
  `;
  static override properties = { items: { state: true }, typed: { state: true }, selected: { state: true } };

  declare items: string[];
  declare typed: string;
  declare selected: number;
  #onPick: (choice: string) => void = () => undefined;

  constructor() {
    super();
    this.items = [];
    this.typed = "";
    this.selected = 0;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("popover", "manual");
    this.setAttribute("role", "listbox");
  }

  /** Shows the choices matching `typed` under `field`, or hides the list when none match. */
  showFor(
    field: HTMLElement,
    {
      typed,
      choices,
      onPick,
    }: { typed: string; choices: readonly string[]; onPick: (choice: string) => void },
  ): void {
    this.items = matching(choices, typed);
    this.typed = typed;
    this.selected = 0;
    this.#onPick = onPick;
    if (this.items.length === 0) {
      this.hide();
      return;
    }
    const box = field.getBoundingClientRect();
    this.style.left = `${String(Math.max(8, Math.min(box.left, window.innerWidth - 260)))}px`;
    this.style.top = `${String(box.bottom + 2)}px`;
    if (!this.matches(":popover-open")) this.showPopover();
  }

  get isOpen(): boolean {
    return this.matches(":popover-open");
  }

  hide(): void {
    if (this.isOpen) this.hidePopover();
  }

  /** ↑/↓ move, Enter or Tab picks, Esc closes. True when the key was used. */
  handleKey(key: string): boolean {
    if (!this.isOpen) return false;
    const step = KEY_STEPS[key];
    if (step !== undefined) {
      this.selected = (this.selected + step + this.items.length) % this.items.length;
      return true;
    }
    if (key === "Escape") {
      this.hide();
      return true;
    }
    if (key !== "Enter" && key !== "Tab") return false;
    this.pick(this.items[this.selected]);
    return true;
  }

  override render(): TemplateResult {
    return html`<ul>
      ${this.items.map(
        (item, index) =>
          html`<li
            role="option"
            class=${index === this.selected ? "is-selected" : ""}
            aria-selected=${String(index === this.selected)}
            @pointerdown=${(event: PointerEvent) => {
              // Keeps the focus in the field while the choice is clicked.
              event.preventDefault();
              this.pick(item);
            }}
          >
            ${highlight(item, this.typed)}
          </li>`,
      )}
    </ul>`;
  }

  private pick(choice: string | undefined): void {
    this.hide();
    if (choice !== undefined) this.#onPick(choice);
  }
}

/** Starting with the typed text first, then containing it; not the typed text itself. */
function matching(choices: readonly string[], typed: string): string[] {
  const lower = typed.trim().toLowerCase();
  if (lower === "") return [];
  const hits = choices.filter(
    (choice) => choice.toLowerCase().includes(lower) && choice.toLowerCase() !== lower,
  );
  const startsFirst = (choice: string): number => (choice.toLowerCase().startsWith(lower) ? 0 : 1);
  return hits.sort((a, b) => startsFirst(a) - startsFirst(b)).slice(0, MAX_SHOWN);
}

function highlight(item: string, typed: string): TemplateResult {
  const at = item.toLowerCase().indexOf(typed.trim().toLowerCase());
  if (at < 0) return html`${item}`;
  const end = at + typed.trim().length;
  return html`${item.slice(0, at)}<b>${item.slice(at, end)}</b>${item.slice(end)}`;
}

customElements.define("suggestion-list", SuggestionList);

/** The one list on the page, created when first needed. */
export function suggestionList(): SuggestionList {
  let list = document.querySelector("suggestion-list");
  if (list === null) {
    list = document.createElement("suggestion-list");
    document.body.append(list);
  }
  return list;
}

declare global {
  interface HTMLElementTagNameMap {
    "suggestion-list": SuggestionList;
  }
}
