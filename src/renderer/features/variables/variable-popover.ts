import { html, LitElement, type TemplateResult } from "lit";
import type { VisibleVariable } from "@shared/models/environment";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { setVariableValue, visibleVariables } from "../../stores/environment-store";
import { openInEnvironments } from "../../stores/view-store";
import { goToIcon } from "../../components/icons";
import { defaultOwnerForNewVariable, scopeLabel, valuePreview } from "./variable-labels";
import { variablePopoverStyles } from "./variable-popover-styles";

const MAX_SUGGESTIONS = 50;
const KEY_STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

/** One popover for the whole app: the {{ suggestion list, or the hover card of one {{variable}}. */
export class VariablePopover extends LitElement {
  static override styles = [formStyles, variablePopoverStyles];
  static override properties = {
    mode: { state: true },
    prefix: { state: true },
    selected: { state: true },
    detailName: { state: true },
  };

  declare mode: "hidden" | "suggest" | "details";
  declare prefix: string;
  declare selected: number;
  declare detailName: string;
  /** Called with the chosen name while suggesting. */
  onPick: (name: string) => void = () => undefined;

  constructor() {
    super();
    this.mode = "hidden";
    this.prefix = "";
    this.selected = 0;
    this.detailName = "";
    watch(this, visibleVariables);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("popover", "manual");
  }

  get suggestions(): VisibleVariable[] {
    const prefix = this.prefix.toLowerCase();
    const matches = visibleVariables.get().filter((variable) => variable.key.toLowerCase().includes(prefix));
    const startsFirst = (variable: VisibleVariable): number =>
      variable.key.toLowerCase().startsWith(prefix) ? 0 : 1;
    return matches.sort((a, b) => startsFirst(a) - startsFirst(b)).slice(0, MAX_SUGGESTIONS);
  }

  showAt(mode: "suggest" | "details", position: { left: number; top: number }): void {
    this.mode = mode;
    const left = Math.max(8, Math.min(position.left, window.innerWidth - 360));
    this.style.left = `${String(left)}px`;
    this.style.top = `${String(position.top)}px`;
    if (!this.matches(":popover-open")) this.showPopover();
  }

  hide(): void {
    this.mode = "hidden";
    if (this.matches(":popover-open")) this.hidePopover();
  }

  /** Arrow keys move the selection; Enter or Tab picks it. Returns true when the key was used. */
  handleKey(key: string): boolean {
    const count = this.suggestions.length;
    if (this.mode !== "suggest" || count === 0) return false;
    const step = KEY_STEPS[key];
    if (step !== undefined) {
      this.selected = (this.selected + step + count) % count;
      return true;
    }
    if (key !== "Enter" && key !== "Tab") return false;
    this.onPick(this.suggestions[this.selected]?.key ?? "");
    return true;
  }

  override render(): TemplateResult | undefined {
    if (this.mode === "suggest") return this.renderSuggestions();
    if (this.mode === "details") return this.renderCard();
    return undefined;
  }

  private renderSuggestions(): TemplateResult {
    const suggestions = this.suggestions;
    if (suggestions.length === 0)
      return html`<ul>
        <li><span class="hint">No variables match "${this.prefix}".</span></li>
      </ul>`;
    return html`<ul role="listbox" aria-label="Variables">
      ${suggestions.map((variable, index) => this.renderSuggestion(variable, index))}
    </ul>`;
  }

  private renderSuggestion(variable: VisibleVariable, index: number): TemplateResult {
    const pick = (event: PointerEvent): void => {
      event.preventDefault(); // keep the focus (and caret) in the field
      this.onPick(variable.key);
    };
    return html`<li
      role="option"
      class=${index === this.selected ? "is-selected" : ""}
      aria-selected=${String(index === this.selected)}
      @pointerdown=${pick}
    >
      <span class="name">${variable.key}</span><span class="scope">${scopeLabel(variable.owner)}</span>
      <span class="preview">${valuePreview(variable)}</span>
    </li>`;
  }

  /** ↗ opens the environment, collection or globals that define it, on the Environments page. */
  private renderGoTo(variable: VisibleVariable): TemplateResult | undefined {
    const owner = variable.owner;
    if (owner === null) return undefined;
    const goTo = (): void => {
      this.hide();
      openInEnvironments(owner, variable.key);
    };
    return html`<button
      type="button"
      class="go-to"
      aria-label="Open in Environments"
      title="Open in Environments"
      @click=${goTo}
    >
      ${goToIcon()}
    </button>`;
  }

  private renderCard(): TemplateResult {
    const variable = visibleVariables.get().find((candidate) => candidate.key === this.detailName);
    return html`<div class="card">
      <header>
        <span class="name">{{${this.detailName}}}</span>
        ${
          variable === undefined
            ? html`<span class="missing">Not defined</span>`
            : html`<span class="scope">${scopeLabel(variable.owner)}</span>${this.renderGoTo(variable)}`
        }
      </header>
      ${variable?.owner === null ? html`<p class="hint">Dynamic: a new value on each send.</p>` : this.renderEditor(variable)}
    </div>`;
  }

  private renderEditor(variable: VisibleVariable | undefined): TemplateResult {
    const owner = variable?.owner ?? defaultOwnerForNewVariable();
    const save = async (event: SubmitEvent): Promise<void> => {
      event.preventDefault();
      const field = (event.currentTarget as HTMLFormElement).elements.namedItem("value") as HTMLInputElement;
      if (await setVariableValue(owner, this.detailName, field.value)) this.hide();
    };
    const isNew = variable === undefined;
    return html`<form class="edit" @submit=${save}>
        ${renderValueField(this.detailName, variable)}
        <button class="primary">${isNew ? "Add" : "Save"}</button>
      </form>
      ${isNew ? html`<p class="hint">Adds it to ${scopeLabel(owner)}.</p>` : undefined}`;
  }
}

function renderValueField(name: string, variable: VisibleVariable | undefined): TemplateResult {
  return html`<input
    name="value"
    aria-label="Value of ${name}"
    autocomplete="off"
    spellcheck="false"
    placeholder="Value"
    .value=${variable?.value ?? ""}
  />`;
}

customElements.define("variable-popover", VariablePopover);

declare global {
  interface HTMLElementTagNameMap {
    "variable-popover": VariablePopover;
  }
}
