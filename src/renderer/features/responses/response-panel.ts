import { html, LitElement, type TemplateResult } from "lit";
import type { ResponseView } from "@shared/models/http-exchange";
import { chevronDownIcon, chevronRightIcon, closeIcon, consoleIcon, logoIcon } from "../../components/icons";
import { withShortcut } from "../../components/shortcut-label";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import {
  hideResponse,
  expandResponse,
  isResponseCollapsed,
  isResponseFullScreen,
  toggleResponseCollapsed,
} from "../../stores/layout-store";
import type { RequestTab, ResponseSection } from "../../stores/request-tab";
import { updateTab } from "../../stores/tab-store";
import { sectionTabsStyles } from "../requests/section-tabs-styles";
import { formatBytes, formatMilliseconds, statusTone } from "./response-format";
import { responseStyles } from "./response-styles";
import { responseBarStyles } from "./response-bar-styles";
import { fitOnOneLine } from "./fit-bar";
import "./response-body";
import "./timing-chart";
import "./script-results";
import "./network-log-dialog";
import { installFullScreenEscape, renderFullScreenButton } from "./response-full-screen";

/** The response of the active tab: status, body (pretty / raw / preview), headers and timing. */
export class ResponsePanel extends LitElement {
  static override styles = [formStyles, sectionTabsStyles, responseStyles, responseBarStyles];
  static override properties = { tab: { attribute: false } };

  declare tab: RequestTab;
  /** Re-fits the title bar whenever the response's size changes (dragging, layout, window). */
  readonly #resizes = new ResizeObserver(() => {
    this.fitBar();
  });

  constructor() {
    super();
    watch(this, isResponseCollapsed, isResponseFullScreen);
    installFullScreenEscape();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#resizes.observe(this);
  }

  override disconnectedCallback(): void {
    this.#resizes.disconnect();
    super.disconnectedCallback();
  }

  protected override updated(): void {
    this.fitBar();
  }

  /** Keeps the title bar on one line, stepping down as needed (fit-bar.ts). */
  private fitBar(): void {
    const bar = this.renderRoot.querySelector<HTMLElement>(".status-line");
    if (bar !== null) fitOnOneLine(bar);
  }

  override render(): TemplateResult {
    const { response, error, sendingRequestId } = this.tab;
    if (sendingRequestId !== undefined) return this.renderSending();
    if (error !== undefined) return this.renderMessage(error, true);
    if (response === undefined) return this.renderMessage("Send the request to see the response here.");
    if (isResponseCollapsed.get()) return this.renderStatusLine(response);
    return html`
      ${this.renderStatusLine(response)} ${this.renderWarnings(response)} ${this.renderSection(response)}
      <div class="footer">
        <span>DNS ${formatMilliseconds(response.timings.dns)}</span><span>·</span>
        <span>Connect ${formatMilliseconds(response.timings.connect)}</span><span>·</span>
        <span>TLS ${formatMilliseconds(response.timings.tls)}</span><span>·</span>
        <span>TTFB ${formatMilliseconds(response.timings.firstByte)}</span><span>·</span>
        <span>Download ${formatMilliseconds(response.timings.download)}</span>
      </div>
    `;
  }

  private renderWarnings(response: ResponseView): TemplateResult | undefined {
    if (response.warnings.length === 0) return undefined;
    return html`<div class="warnings" role="alert">
      ${response.warnings.map((warning) => html`<p>⚠ ${warning}</p>`)}
    </div>`;
  }

  /** Like Postman: a moving bar on the panel's top edge, and the logo above "Sending…". */
  private renderSending(): TemplateResult {
    const message = html`<div class="message is-sending" role="status">
      ${logoIcon(40)}<span>Sending…</span>
    </div>`;
    return html`<div class="loading-bar" role="progressbar" aria-label="Sending request"></div>
      <div class="status-line">${renderTitle(this.tab)}<span class="spacer"></span>${renderClose()}</div>
      ${isResponseCollapsed.get() ? undefined : message}`;
  }

  /** The send's network log (JSON): the request as sent, proxy, TLS, the response or the error. */
  private renderLogButton(label = "Show log"): TemplateResult | undefined {
    const requestId = this.tab.lastRequestId;
    if (requestId === undefined) return undefined;
    const open = (): void => {
      void this.renderRoot.querySelector("network-log-dialog")?.open(requestId);
    };
    return html`<button title="The request as sent, the proxy, TLS and the response, as JSON" @click=${open}>
        ${label}</button
      ><network-log-dialog></network-log-dialog>`;
  }

  private renderMessage(text: string, isError = false): TemplateResult {
    const message = html`<div
      class="message ${isError ? "is-error" : ""}"
      role=${isError ? "alert" : "status"}
    >
      ${isError ? logoIcon(40) : undefined}<span>${text}</span>
      ${isError ? this.renderLogButton() : undefined}
    </div>`;
    return html`<div class="status-line">
        ${renderTitle(this.tab)}<span class="spacer"></span>${renderClose()}
      </div>
      ${isResponseCollapsed.get() ? undefined : message}`;
  }

  /** "Response", the Body / Headers / Tests tabs; on the right status, time and size, then Timing. */
  private renderStatusLine(response: ResponseView): TemplateResult {
    return html`<div class="status-line">
      ${renderTitle(this.tab)}
      <div class="section-tabs" role="tablist" aria-label="Response">
        ${this.renderSectionTab("body", "Body")}
        ${this.renderSectionTab("headers", `Headers ${String(response.headers.length)}`)}
        ${this.renderSectionTab("tests", testsLabel(response))}
      </div>
      <span class="spacer"></span>
      ${renderMetrics(response)}
      <div class="section-tabs" role="tablist" aria-label="Timing">
        ${this.renderSectionTab("timing", "Timing")}
      </div>
      <div class="section-tabs">${this.renderLogButton("Log")}</div>
      ${renderFullScreenButton()} ${renderClose()}
    </div>`;
  }

  private renderSectionTab(section: ResponseSection, label: string): TemplateResult {
    return html`<button
      role="tab"
      aria-selected=${String(this.tab.responseSection === section)}
      @click=${() => {
        updateTab(this.tab.id, { responseSection: section });
        expandResponse();
      }}
    >
      ${label}
    </button>`;
  }

  private renderSection(response: ResponseView): TemplateResult {
    if (this.tab.responseSection === "headers") {
      return html`<div class="scroll">
        <table>
          <tbody>
            ${response.headers.map(
              (header) =>
                html`<tr>
                  <td>${header.key}</td>
                  <td>${header.value}</td>
                </tr>`,
            )}
          </tbody>
        </table>
      </div>`;
    }
    if (this.tab.responseSection === "tests")
      return html`<script-results .report=${response.scripts}></script-results>`;
    if (this.tab.responseSection === "timing")
      return html`<timing-chart .timings=${response.timings}></timing-chart>`;
    return this.renderBody(response);
  }

  private renderBody(response: ResponseView): TemplateResult {
    const { body } = response;
    if (body.isBinary && body.image === undefined) {
      return html`<div class="message">
        Binary body (${body.contentType || "unknown type"}, ${formatBytes(body.size)}). It is not shown as
        text.
      </div>`;
    }
    return html`<response-body .tab=${this.tab} .response=${response}></response-body>`;
  }
}

/** "Response" with a chevron: collapses the panel to this line, giving the request the full height. */
/** The console button (opens the Tests tab: test results and script output), then "Response". */
function renderTitle(tab: RequestTab): TemplateResult {
  const isCollapsed = isResponseCollapsed.get();
  const openConsole = (): void => {
    expandResponse();
    updateTab(tab.id, { responseSection: "tests" });
  };
  return html`<button
      class="console"
      aria-label="Scripts console"
      title="Scripts console: tests and console.log"
      @click=${openConsole}
    >
      ${consoleIcon()}
    </button>
    <button
      class="title"
      aria-expanded=${String(!isCollapsed)}
      title=${isCollapsed ? "Unfold the response" : "Fold the response to this bar"}
      @click=${toggleResponseCollapsed}
    >
      <span class="chevron">${isCollapsed ? chevronRightIcon() : chevronDownIcon()}</span
      ><span class="title-text">Response</span>
    </button>`;
}

/** × on the right: closes the response panel entirely (sending or the shortcut bring it back). */
function renderClose(): TemplateResult {
  return html`<button
    class="close-panel"
    aria-label="Close response"
    title=${withShortcut("Close response (sending shows it again)", "Mod+Shift+R")}
    @click=${hideResponse}
  >
    ${closeIcon()}
  </button>`;
}

customElements.define("response-panel", ResponsePanel);

declare global {
  interface HTMLElementTagNameMap {
    "response-panel": ResponsePanel;
  }
}

/** "Tests 3/4" (passed / run), "Tests !" when a script failed, or just "Tests". */
function testsLabel(response: ResponseView): string {
  const report = response.scripts;
  if (report === undefined) return "Tests";
  const run = report.tests.filter((test) => test.skipped !== true);
  const passed = run.filter((test) => test.passed).length;
  if (run.length > 0) return `Tests ${String(passed)}/${String(run.length)}`;
  return report.errors.length > 0 ? "Tests !" : "Tests";
}

/** Status, total time, size and redirects of the response. */
function renderMetrics(response: ResponseView): TemplateResult {
  // Parts marked with a class step back when the response is narrow (response-styles.ts).
  const summary = `${String(response.status)} ${response.statusText} · ${formatMilliseconds(response.timings.total)} · ${formatBytes(response.body.size)}`;
  return html`<span class="pill ${statusTone(response.status)}" title=${summary}
      >${String(response.status)}<span class="status-text"> ${response.statusText}</span></span
    >
    <span class="metric">${formatMilliseconds(response.timings.total)}</span>
    <span class="metric is-size">${formatBytes(response.body.size)}</span>
    ${
      response.redirectCount > 0
        ? html`<span class="metric is-redirects" title=${response.url}
            >${String(response.redirectCount)} redirects</span
          >`
        : undefined
    }`;
}
