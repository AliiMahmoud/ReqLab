import { css, html, LitElement, type TemplateResult } from "lit";
import type { ResponseView } from "@shared/models/http-exchange";
import type { CodeArea, CodeLanguage } from "../../components/code-area";
import "../../components/code-area";
import { formatMarkup } from "../../components/format-markup";
import { prettyPrintJson } from "../../components/json-format";
import { languageForContentType } from "../../components/raw-content-types";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { isBodyWrapped, toggleBodyWrap } from "../../stores/layout-store";
import type { BodyView, RequestTab } from "../../stores/request-tab";
import { updateTab } from "../../stores/tab-store";
import { sectionTabsStyles } from "../requests/section-tabs-styles";
import { createPreviewDocument } from "./preview-document";
import "./response-image";
import { hexDump } from "./hex-dump";
import { formatBytes, isHtml, isJson } from "./response-format";
import { responseStyles } from "./response-styles";

interface Shown {
  text: string;
  language: CodeLanguage;
}

/**
 * The response body in a read-only code editor: Pretty (JSON / XML / HTML re-indented) or Raw,
 * with folding, Wrap, and Cmd/Ctrl+A + Cmd/Ctrl+C selecting and copying just the body (folded parts too).
 * HTML can also be previewed in a sandboxed frame.
 */
export class ResponseBody extends LitElement {
  static override styles = [
    formStyles,
    sectionTabsStyles,
    responseStyles,
    css`
      :host {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .content {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      code-area {
        flex: 1;
        min-height: 0;
      }
    `,
  ];
  static override properties = { tab: { attribute: false }, response: { attribute: false } };

  declare tab: RequestTab;
  declare response: ResponseView;
  #shownFor = "";
  #shown: Shown = { text: "", language: "text" };

  constructor() {
    super();
    watch(this, isBodyWrapped);
  }

  override render(): TemplateResult {
    const { body } = this.response;
    if (this.showsImage()) return this.renderImageView();
    const isPreview = this.tab.bodyView === "preview" && isHtml(body.contentType);
    const shown = isPreview ? undefined : this.shownText();
    return html`
      ${this.renderChips(shown)}
      <div class="content">${shown === undefined ? this.renderPreview() : this.renderEditor(shown)}</div>
    `;
  }

  /** View buttons; the truncation note, Collapse / Expand all and Wrap for text. */
  private renderChips(shown: Shown | undefined): TemplateResult {
    const { body } = this.response;
    return html`<div class="chips" role="group" aria-label="Body view">
      ${this.renderViewButtons(body.contentType)}
      <span class="spacer"></span>
      ${body.isTruncated ? html`<span>Showing the first 20 MB of ${formatBytes(body.size)}</span>` : undefined}
      ${shown !== undefined && shown.language !== "text" ? this.renderFoldButtons() : undefined}
      ${shown === undefined ? undefined : this.renderWrapButton()}
    </div>`;
  }

  private renderViewButtons(contentType: string): TemplateResult[] {
    const views: [BodyView, string][] = this.isRasterImage()
      ? [
          ["preview", "Preview"],
          ["raw", "Raw"],
        ]
      : [
          ["pretty", "Pretty"],
          ["raw", "Raw"],
        ];
    if (isHtml(contentType) || this.response.body.image?.mimeType === "image/svg+xml")
      views.push(["preview", "Preview"]);
    const current = this.isRasterImage() && this.tab.bodyView !== "raw" ? "preview" : this.tab.bodyView;
    return views.map(([view, label]) => {
      const choose = (): void => {
        updateTab(this.tab.id, { bodyView: view });
      };
      return html`<button aria-pressed=${String(current === view)} @click=${choose}>${label}</button>`;
    });
  }

  /** An image shows as a picture; an SVG can also be read as text (Pretty / Raw). */
  /** A picture shows as one; Raw shows its bytes (a hex dump), or an SVG's text. */
  private showsImage(): boolean {
    const { image } = this.response.body;
    if (image === undefined || this.tab.bodyView === "raw") return false;
    return image.mimeType !== "image/svg+xml" || this.tab.bodyView === "preview";
  }

  private isRasterImage(): boolean {
    const { image } = this.response.body;
    return image !== undefined && image.mimeType !== "image/svg+xml";
  }

  private renderImageView(): TemplateResult {
    const { body } = this.response;
    const image = body.image;
    if (image === undefined) return html``;
    return html`<div class="chips" role="group" aria-label="Body view">
        ${this.renderViewButtons(body.contentType)}
      </div>
      <div class="content"><response-image .image=${image} .size=${body.size}></response-image></div>`;
  }

  private renderFoldButtons(): TemplateResult {
    const editor = (): CodeArea | null => this.renderRoot.querySelector("code-area");
    return html`
      <button title="Fold everything" @click=${() => editor()?.foldAll()}>Collapse all</button>
      <button title="Unfold everything" @click=${() => editor()?.unfoldAll()}>Expand all</button>
    `;
  }

  private renderWrapButton(): TemplateResult {
    return html`<button
      aria-pressed=${String(isBodyWrapped.get())}
      title="Wrap long lines"
      @click=${toggleBodyWrap}
    >
      Wrap
    </button>`;
  }

  private renderEditor(shown: Shown): TemplateResult {
    return html`<code-area
      .value=${shown.text}
      .language=${shown.language}
      .wrap=${isBodyWrapped.get()}
      .readOnly=${true}
      .label=${"Response body"}
    ></code-area>`;
  }

  private renderPreview(): TemplateResult {
    return html`<iframe
      sandbox=""
      title="Response preview"
      .srcdoc=${createPreviewDocument(this.response.body.text)}
    ></iframe>`;
  }

  /** The text to show and its language, worked out once per body and view. */
  private shownText(): Shown {
    const { image } = this.response.body;
    if (image !== undefined && this.isRasterImage()) return { text: hexDump(image.base64), language: "text" };
    const { text, contentType } = this.response.body;
    const key = `${this.tab.bodyView}\u0000${contentType}\u0000${text}`;
    if (key === this.#shownFor) return this.#shown;
    this.#shownFor = key;
    this.#shown = describeBody(text, contentType, this.tab.bodyView === "pretty");
    return this.#shown;
  }
}

/** JSON (by type or by look) and XML / HTML get colours and folding; Pretty also re-indents them. */
function describeBody(text: string, contentType: string, isPretty: boolean): Shown {
  const prettyJson = isJson(contentType) || /^\s*[[{]/.test(text) ? prettyPrintJson(text) : undefined;
  if (prettyJson !== undefined) return { text: isPretty ? prettyJson : text, language: "json" };
  if (!isMarkup(contentType)) return { text, language: "text" };
  return { text: isPretty ? (formatMarkup(text) ?? text) : text, language: "xml" };
}

function isMarkup(contentType: string): boolean {
  return languageForContentType(contentType) === "xml" || isHtml(contentType);
}

customElements.define("response-body", ResponseBody);

declare global {
  interface HTMLElementTagNameMap {
    "response-body": ResponseBody;
  }
}
