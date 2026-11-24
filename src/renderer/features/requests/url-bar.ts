import { html, LitElement, type TemplateResult } from "lit";
import { checkIcon, codeIcon } from "../../components/icons";
import "../../components/method-picker";
import { withShortcut } from "../../components/shortcut-label";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { knownVariableNames } from "../../stores/environment-store";
import { networkSettings } from "../../stores/network-store";
import { looksLikeCurl, pasteCurlIntoTab } from "../../stores/curl-paste";
import { paramsFromUrl, pathVariablesFromUrl } from "../../stores/query-sync";
import type { RequestTab } from "../../stores/request-tab";
import { updateDraft } from "../../stores/tab-store";
import { urlBarStyles } from "./url-bar-styles";

const VARIABLE_PART = /(\{\{[^{}]+\}\})/;

/**
 * Method, URL and Send. {{variables}} in the URL are coloured from behind the text field:
 * amber when defined, red when nothing defines them.
 */
export class UrlBar extends LitElement {
  static override styles = [formStyles, urlBarStyles];
  static override properties = { tab: { attribute: false }, isCopied: { state: true } };

  declare tab: RequestTab;
  /** Briefly true after "Copy as cURL", to show a check mark. */
  declare isCopied: boolean;
  #copiedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.isCopied = false;
    watch(this, knownVariableNames, networkSettings);
  }

  override render(): TemplateResult {
    return html`
      <div class="field">${this.renderMethodPicker()} ${this.renderUrlField()}</div>
      ${this.renderActions()}
    `;
  }

  private renderMethodPicker(): TemplateResult {
    return html`<method-picker
      .value=${this.tab.draft.method}
      .onChange=${this.changeMethod}
    ></method-picker>`;
  }

  private renderUrlField(): TemplateResult {
    return html`<label class="url">
      <span class="visually-hidden">URL</span>
      <div class="highlight" aria-hidden="true">${this.renderHighlightedUrl()}</div>
      <input
        data-variables
        spellcheck="false"
        placeholder="https://api.example.com/v1/…, {{baseUrl}}/path, or paste a cURL command"
        .value=${this.tab.draft.url}
        @input=${this.changeUrl}
        @paste=${this.pasteUrl}
        @scroll=${this.syncScroll}
        @keyup=${this.syncScroll}
        @keydown=${this.syncScroll}
        @select=${this.syncScroll}
        @selectionchange=${this.syncScroll}
        @focus=${this.syncScroll}
        @blur=${this.syncScroll}
        @pointerdown=${this.followWhileSelecting}
      />
    </label>`;
  }

  private renderActions(): TemplateResult {
    const emit = (name: string) => (): void => {
      this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
    };
    const sendOrCancel =
      this.tab.sendingRequestId === undefined
        ? html`<button
            class="send primary"
            title=${withShortcut("Send", "Mod+Enter")}
            @click=${emit("send-request")}
          >
            Send
          </button>`
        : html`<button class="send" title="Cancel the request" @click=${emit("cancel-request")}>
            Cancel
          </button>`;
    const tlsBadge =
      networkSettings.get()?.verifyTls === false
        ? html`<span
            class="tls-off"
            title="TLS certificate verification is off for this workspace (Network settings)"
            >TLS off</span
          >`
        : undefined;
    return html`${tlsBadge}${sendOrCancel} ${this.renderCopyCurl()}`;
  }

  private renderHighlightedUrl(): TemplateResult[] {
    const names = knownVariableNames.get();
    return this.tab.draft.url.split(VARIABLE_PART).map((part) => {
      if (!VARIABLE_PART.test(part)) return html`${part}`;
      const isKnown = names.has(part.slice(2, -2).trim());
      return html`<span
        class="variable ${isKnown ? "" : "is-missing"}"
        title=${isKnown ? "" : "Not defined in the active environment, collection or globals"}
        >${part}</span
      >`;
    });
  }

  private renderCopyCurl(): TemplateResult {
    const copy = (): void => {
      this.dispatchEvent(new CustomEvent("copy-curl", { bubbles: true, composed: true }));
      this.flashCopied();
    };
    return html`<button
      class="icon curl ${this.isCopied ? "is-copied" : ""}"
      aria-label="Copy as cURL"
      title="Copy as cURL"
      @click=${copy}
    >
      ${this.isCopied ? checkIcon(16) : codeIcon()}
    </button>`;
  }

  private flashCopied(): void {
    this.isCopied = true;
    clearTimeout(this.#copiedTimer);
    this.#copiedTimer = setTimeout(() => {
      this.isCopied = false;
    }, 1_500);
  }

  private readonly changeMethod = (method: string): void => {
    updateDraft(this.tab.id, { method });
  };

  /** Pasting a whole `curl …` command fills in the entire request instead of the URL. */
  private readonly pasteUrl = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (!looksLikeCurl(text)) return;
    event.preventDefault();
    void pasteCurlIntoTab(this.tab.id, text);
  };

  private readonly changeUrl = (event: Event): void => {
    const url = (event.target as HTMLInputElement).value;
    const { params, pathVariables } = this.tab.draft;
    updateDraft(this.tab.id, {
      url,
      params: paramsFromUrl(url, params),
      pathVariables: pathVariablesFromUrl(url, pathVariables),
    });
    this.syncScroll();
  };

  /**
   * The coloured copy behind the transparent input must scroll with it, or a long URL's selection
   * lands on other text. Selecting, Cmd/Ctrl+A or a changed URL can scroll it without a scroll event.
   */
  private readonly syncScroll = (): void => {
    const input = this.renderRoot.querySelector<HTMLInputElement>(".url input");
    const highlight = this.renderRoot.querySelector<HTMLElement>(".highlight");
    if (input !== null && highlight !== null) highlight.scrollLeft = input.scrollLeft;
  };

  /** Dragging a selection scrolls the input on its own: follow it every frame until the press ends. */
  private readonly followWhileSelecting = (): void => {
    let isPressed = true;
    const follow = (): void => {
      this.syncScroll();
      if (isPressed) requestAnimationFrame(follow);
    };
    window.addEventListener(
      "pointerup",
      () => {
        isPressed = false;
        requestAnimationFrame(this.syncScroll);
      },
      { once: true },
    );
    requestAnimationFrame(follow);
  };

  /** A URL set from elsewhere (undo, another tab, a pasted cURL) may scroll the input too. */
  protected override updated(): void {
    this.syncScroll();
  }
}

customElements.define("url-bar", UrlBar);

declare global {
  interface HTMLElementTagNameMap {
    "url-bar": UrlBar;
  }
}
