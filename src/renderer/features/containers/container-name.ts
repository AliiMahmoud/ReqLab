import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { formStyles } from "../../components/shared-styles";
import { renameTreeEntry } from "../../stores/collection-store";
import { reconcileTabsWithTree } from "../../stores/tab-store";

/**
 * The name at the top of a collection / folder settings tab. Click it to rename: Enter or leaving
 * the field saves (tree and tab follow), Escape cancels.
 */
export class ContainerName extends LitElement {
  static override styles = [
    formStyles,
    css`
      :host {
        display: flex;
        min-width: 0;
        flex: 1;
      }
      .name {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 3px 6px;
        border: 1px solid transparent;
        background: transparent;
        font-size: calc(15px * var(--text-scale));
        font-weight: 600;
        text-align: start;
        cursor: text;
      }
      .name:hover:not(:disabled) {
        background: transparent;
        border-color: var(--color-field-border);
      }
      input {
        flex: 1;
        min-width: 260px;
        max-width: 560px;
        padding: 3px 6px;
        font-size: calc(15px * var(--text-scale));
        font-weight: 600;
      }
    `,
  ];
  static override properties = {
    workspaceId: { attribute: false },
    entryId: { attribute: false },
    name: { attribute: false },
    isEditing: { state: true },
  };

  declare workspaceId: string;
  declare entryId: string;
  declare name: string;
  declare isEditing: boolean;

  constructor() {
    super();
    this.isEditing = false;
  }

  /** Another collection or folder (the tab changed): stop editing the previous one's name. */
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("entryId") && changed.get("entryId") !== undefined) this.isEditing = false;
  }

  override render(): TemplateResult {
    if (!this.isEditing)
      return html`<button class="name" title=${`${this.name} (click to rename)`} @click=${this.startEditing}>
        ${this.name}
      </button>`;
    return html`<input
      aria-label="Name"
      maxlength="200"
      .value=${this.name}
      @keydown=${this.handleKey}
      @blur=${this.commit}
    />`;
  }

  protected override updated(): void {
    const input = this.renderRoot.querySelector("input");
    if (input !== null && !input.matches(":focus")) {
      input.focus();
      input.select();
    }
  }

  private readonly startEditing = (): void => {
    this.isEditing = true;
  };

  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key === "Enter") (event.target as HTMLInputElement).blur();
    if (event.key !== "Escape") return;
    event.preventDefault();
    this.isEditing = false;
  };

  private readonly commit = async (event: FocusEvent): Promise<void> => {
    if (!this.isEditing) return;
    this.isEditing = false;
    const name = (event.target as HTMLInputElement).value.trim();
    if (name === "" || name === this.name) return;
    await renameTreeEntry(this.workspaceId, this.entryId, name);
    reconcileTabsWithTree();
  };
}

customElements.define("container-name", ContainerName);

declare global {
  interface HTMLElementTagNameMap {
    "container-name": ContainerName;
  }
}
