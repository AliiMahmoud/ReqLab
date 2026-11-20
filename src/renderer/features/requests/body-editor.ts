import { html, LitElement, type TemplateResult } from "lit";
import type { BodyType, RequestBody } from "@shared/models/request";
import type { CodeArea, CodeLanguage } from "../../components/code-area";
import { languageForContentType, rawContentTypeOptions } from "../../components/raw-content-types";
import "../../components/ui-select";
import { withShortcut } from "../../components/shortcut-label";
import "../../components/code-area";
import "../../components/key-value-table";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { beautifyActiveBody } from "../../stores/body-actions";
import { isEditorWrapped, toggleEditorWrap } from "../../stores/layout-store";
import { sectionTabsStyles } from "./section-tabs-styles";

const BODY_TYPE_LABELS: [BodyType, string][] = [
  ["none", "none"],
  ["json", "JSON"],
  ["form-data", "form-data"],
  ["urlencoded", "x-www-form"],
  ["raw", "raw"],
  ["graphql", "GraphQL"],
];

/** An edit of the body; switching type also updates the other types' kept content. */
export interface BodyChange {
  body: RequestBody;
  otherBodies?: RequestBody[];
}

/**
 * Picks the body type and edits it. Switching type keeps the old type's content, so switching
 * back restores it; a type used for the first time starts from the text both types share.
 */
export class BodyEditor extends LitElement {
  static override styles = [formStyles, sectionTabsStyles];
  static override properties = {
    body: { attribute: false },
    otherBodies: { attribute: false },
    onChange: { attribute: false },
  };

  declare body: RequestBody;
  declare otherBodies: RequestBody[];
  declare onChange: (change: BodyChange) => void;

  constructor() {
    super();
    watch(this, isEditorWrapped);
  }

  override render(): TemplateResult {
    return html`
      <div class="chips" role="group" aria-label="Body type">
        ${BODY_TYPE_LABELS.map(
          ([type, label]) =>
            html`<button
              aria-pressed=${String(this.body.type === type)}
              @click=${() => {
                this.switchType(type);
              }}
            >
              ${label}
            </button>`,
        )}
        <span class="spacer"></span>
        ${this.renderTools()}
      </div>
      ${this.renderEditor()}
    `;
  }

  private renderEditor(): TemplateResult {
    const body = this.body;
    switch (body.type) {
      case "none":
        return html`<p class="placeholder">This request has no body.</p>`;
      case "json":
      case "raw":
        return this.renderTextEditor(body);
      case "urlencoded":
      case "form-data":
        return html`<key-value-table
          .rows=${body.fields}
          .title=${body.type === "form-data" ? "Form data" : "Form fields (x-www-form-urlencoded)"}
          .onChange=${(fields: typeof body.fields) => {
            this.onChange({ body: { ...body, fields } });
          }}
        ></key-value-table>`;
      case "graphql":
        return this.renderGraphqlEditor(body);
    }
  }

  /** Folding and Beautify where the content is JSON or XML / HTML; Wrap for every text body. */
  private renderTools(): TemplateResult | undefined {
    const body = this.body;
    if (body.type === "none" || body.type === "urlencoded" || body.type === "form-data") return undefined;
    const language = this.editorLanguage();
    const editor = (): CodeArea | null => this.renderRoot.querySelector("code-area");
    const canFold = language !== "text";
    const canBeautify = canFold || body.type === "graphql";
    return html`
      ${canFold ? html`<button title="Fold everything" @click=${() => editor()?.foldAll()}>Collapse all</button>` : undefined}
      ${canFold ? html`<button title="Unfold everything" @click=${() => editor()?.unfoldAll()}>Expand all</button>` : undefined}
      ${canBeautify ? html`<button title=${withShortcut("Beautify", "Mod+B")} @click=${beautifyActiveBody}>Beautify</button>` : undefined}
      <button
        aria-pressed=${String(isEditorWrapped.get())}
        title="Wrap long lines"
        @click=${toggleEditorWrap}
      >
        Wrap
      </button>
    `;
  }

  /** JSON bodies are JSON; raw bodies follow their Content-Type. */
  private editorLanguage(): CodeLanguage {
    if (this.body.type === "json") return "json";
    return this.body.type === "raw" ? languageForContentType(this.body.contentType) : "text";
  }

  private renderTextEditor(body: Extract<RequestBody, { type: "json" | "raw" }>): TemplateResult {
    const changeText = (text: string): void => {
      this.onChange({ body: { ...body, text } });
    };
    return html`${body.type === "raw" ? this.renderContentTypePicker(body) : undefined}
      <code-area
        .value=${body.text}
        .label=${"Request body"}
        .language=${this.editorLanguage()}
        .wrap=${isEditorWrapped.get()}
        .placeholder=${body.type === "json" ? '{ "key": "{{variable}}" }' : ""}
        .onChange=${changeText}
      ></code-area>`;
  }

  private renderContentTypePicker(body: Extract<RequestBody, { type: "raw" }>): TemplateResult {
    const choose = (contentType: string): void => {
      this.onChange({ body: { ...body, contentType } });
    };
    const current = body.contentType.trim() === "" ? "text/plain" : body.contentType;
    return html`<div class="chips">
      Content-Type
      <ui-select
        .options=${rawContentTypeOptions(current)}
        .value=${current}
        .label=${"Content-Type"}
        .onChange=${choose}
      ></ui-select>
    </div>`;
  }

  private renderGraphqlEditor(body: Extract<RequestBody, { type: "graphql" }>): TemplateResult {
    return html`
      <code-area
        .value=${body.query}
        .label=${"GraphQL query"}
        .wrap=${isEditorWrapped.get()}
        .placeholder=${"query { … }"}
        .onChange=${(query: string) => {
          this.onChange({ body: { ...body, query } });
        }}
      ></code-area>
      <p class="chips">Variables (JSON)</p>
      <code-area
        .value=${body.variables}
        .label=${"GraphQL variables"}
        .language=${"json"}
        .wrap=${isEditorWrapped.get()}
        .placeholder=${"{ }"}
        .onChange=${(variables: string) => {
          this.onChange({ body: { ...body, variables } });
        }}
      ></code-area>
    `;
  }

  private switchType(type: BodyType): void {
    const current = this.body;
    if (type === current.type) return;
    const restored = this.otherBodies.find((other) => other.type === type);
    const others = this.otherBodies.filter((other) => other.type !== type && other.type !== current.type);
    this.onChange({
      body: restored ?? convertBody(current, type),
      otherBodies: current.type === "none" ? others : [...others, current],
    });
  }
}

function convertBody(body: RequestBody, type: BodyType): RequestBody {
  const text = readBodyText(body);
  const fields = "fields" in body ? body.fields : [];
  switch (type) {
    case "none":
      return { type };
    case "json":
      return { type, text };
    case "raw":
      return { type, text, contentType: "text/plain" };
    case "urlencoded":
    case "form-data":
      return { type, fields };
    case "graphql":
      return { type, query: text, variables: "" };
  }
}

/** The text worth keeping when switching type: the body text, or the GraphQL query. */
function readBodyText(body: RequestBody): string {
  if ("text" in body) return body.text;
  return "query" in body ? body.query : "";
}

customElements.define("body-editor", BodyEditor);

declare global {
  interface HTMLElementTagNameMap {
    "body-editor": BodyEditor;
  }
}
