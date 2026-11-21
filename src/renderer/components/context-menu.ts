import { css, html, LitElement, type TemplateResult } from "lit";
import { shortcutLabel } from "./shortcut-label";

export interface MenuItem {
  label: string;
  run: () => void;
  isEnabled?: boolean;
  /** "Mod+W" style; shown on the right. */
  shortcut?: string;
  icon?: TemplateResult;
  isDanger?: boolean;
  /** Draws a divider above this item. */
  startsGroup?: boolean;
}

/** A right-click menu: open it with its items at the pointer. Arrow keys move, Escape closes. */
export class ContextMenu extends LitElement {
  static override styles = css`
    :host {
      position: fixed;
      inset: auto;
      margin: 0;
      padding: 4px;
      min-width: 220px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-large);
      background: var(--color-raised);
      color: var(--color-text);
      box-shadow: var(--shadow-popup);
      font-size: calc(12.5px * var(--text-scale));
    }
    button {
      display: flex;
      justify-content: space-between;
      gap: var(--space-4);
      width: 100%;
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
    }
    button:hover:not(:disabled),
    button:focus-visible {
      outline: none;
      background: var(--color-hover-tint);
    }
    button:disabled {
      color: var(--color-text-faint);
    }
    .label {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .label svg {
      color: var(--color-text-muted);
    }
    button.danger {
      color: var(--color-danger);
    }
    .shortcut {
      color: var(--color-text-faint);
    }
    hr {
      margin: 4px 6px;
      border: none;
      border-top: 1px solid var(--color-border-soft);
    }
  `;
  static override properties = { items: { state: true } };

  declare items: MenuItem[];

  constructor() {
    super();
    this.items = [];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("popover", "manual");
    this.setAttribute("role", "menu");
    this.addEventListener("keydown", this.handleKey);
    document.addEventListener("pointerdown", this.closeOnOutsideClick, true);
  }

  override disconnectedCallback(): void {
    document.removeEventListener("pointerdown", this.closeOnOutsideClick, true);
    super.disconnectedCallback();
  }

  async open(items: MenuItem[], position: { x: number; y: number }): Promise<void> {
    this.items = items;
    this.style.left = `${String(Math.min(position.x, window.innerWidth - 260))}px`;
    this.style.top = `${String(Math.min(position.y, window.innerHeight - 40 * items.length))}px`;
    if (!this.matches(":popover-open")) this.showPopover();
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }

  close(): void {
    this.items = [];
    if (this.matches(":popover-open")) this.hidePopover();
  }

  override render(): TemplateResult[] {
    return this.items.map((item) => this.renderItem(item));
  }

  private renderItem(item: MenuItem): TemplateResult {
    const run = (): void => {
      this.close();
      item.run();
    };
    return html`${item.startsGroup === true ? html`<hr />` : undefined}
      <button
        role="menuitem"
        class=${item.isDanger === true ? "danger" : ""}
        ?disabled=${item.isEnabled === false}
        @click=${run}
      >
        <span class="label">${item.icon}${item.label}</span>
        ${item.shortcut === undefined ? undefined : html`<span class="shortcut">${shortcutLabel(item.shortcut)}</span>`}
      </button>`;
  }

  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = [...this.renderRoot.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    const current = buttons.indexOf((this.renderRoot as ShadowRoot).activeElement as HTMLButtonElement);
    buttons[(current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  };

  private readonly closeOnOutsideClick = (event: PointerEvent): void => {
    if (this.items.length > 0 && !event.composedPath().includes(this)) this.close();
  };
}

customElements.define("context-menu", ContextMenu);

declare global {
  interface HTMLElementTagNameMap {
    "context-menu": ContextMenu;
  }
}
