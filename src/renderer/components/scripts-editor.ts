import { css, html, LitElement, type TemplateResult } from "lit";
import type { Scripts } from "@shared/models/scripts";
import "./code-area";
import { scriptCompletionConfig } from "./script-completions";
import { requestIdLabels } from "./request-id-labels";
import "./script-docs";

type Phase = "preRequest" | "postResponse";

const NO_SCRIPTS: Scripts = { preRequest: "", postResponse: "" };

const PHASES: { phase: Phase; label: string; placeholder: string }[] = [
  { phase: "preRequest", label: "Pre-request", placeholder: "// Runs before the request is sent" },
  { phase: "postResponse", label: "Post-response", placeholder: "// Runs after the response arrives" },
];

/** Postman-style scripts of a request, folder or collection: one editor per phase. */
export class ScriptsEditor extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-height: 0;
    }
    /* A segmented control above the editor, on the left: two equal halves, the chosen one raised. */
    /* The phase switch on the left, the help button on the right. */
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 10px 0 4px;
    }
    .phases {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-sunken);
    }
    .phases button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 132px;
      height: 28px;
      padding: 0 16px;
      border: none;
      border-radius: var(--radius-small);
      background: transparent;
      color: var(--color-text-muted);
      font: inherit;
      font-size: calc(12.5px * var(--text-scale));
      font-weight: 500;
      line-height: 1;
      cursor: pointer;
      transition:
        background-color 120ms ease,
        color 120ms ease;
    }
    .phases button:hover:not([aria-pressed="true"]) {
      color: var(--color-text);
    }
    .phases button[aria-pressed="true"] {
      background: var(--color-raised);
      color: var(--color-text);
      box-shadow:
        0 1px 2px rgb(0 0 0 / 12%),
        0 0 0 1px var(--color-border-soft);
    }
    .phases .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-success);
    }
    code-area {
      flex: 1;
      min-height: 200px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-small);
    }
  `;
  static override properties = {
    scripts: { attribute: false },
    onChange: { attribute: false },
    phase: { state: true },
  };

  declare scripts: Scripts | undefined;
  declare onChange: (scripts: Scripts) => void;
  declare phase: Phase;

  constructor() {
    super();
    this.scripts = undefined;
    this.onChange = () => undefined;
    this.phase = "preRequest";
  }

  override render(): TemplateResult {
    const scripts = this.scripts ?? NO_SCRIPTS;
    const current = PHASES.find((entry) => entry.phase === this.phase) ?? PHASES[0];
    const change = (text: string): void => {
      this.onChange({ ...scripts, [this.phase]: text });
    };
    return html`<div class="bar">
        <div class="phases" role="group" aria-label="Script">
          ${PHASES.map((entry) => this.renderPhaseButton(entry, scripts[entry.phase].trim() !== ""))}
        </div>
        <script-docs></script-docs>
      </div>
      <code-area
        .value=${scripts[this.phase]}
        .label=${`${current?.label ?? ""} script`}
        .placeholder=${current?.placeholder ?? ""}
        .lineComment=${"//"}
        .language=${"javascript"}
        .completions=${scriptCompletionConfig}
        .extras=${requestIdLabels}
        .onChange=${change}
      ></code-area>`;
  }

  private renderPhaseButton(entry: (typeof PHASES)[number], hasScript: boolean): TemplateResult {
    const choose = (): void => {
      this.phase = entry.phase;
    };
    return html`<button aria-pressed=${String(this.phase === entry.phase)} @click=${choose}>
      ${entry.label}${hasScript ? html`<span class="dot" title="Has a script"></span>` : undefined}
    </button>`;
  }
}

customElements.define("scripts-editor", ScriptsEditor);

declare global {
  interface HTMLElementTagNameMap {
    "scripts-editor": ScriptsEditor;
  }
}
