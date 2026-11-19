import { html, LitElement, type TemplateResult } from "lit";
import type { ResponseView } from "@shared/models/http-exchange";
import { chevronDownIcon, chevronRightIcon, closeIcon, consoleIcon, logoIcon } from "../../components/icons";
import { withShortcut } from "../../components/shortcut-label";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import {
  collapseResponse,
  expandResponse,
  isResponseCollapsed,
  toggleResponse,
} from "../../stores/layout-store";
import type { RequestTab, ResponseSection } from "../../stores/request-tab";
import { updateTab } from "../../stores/tab-store";
import { sectionTabsStyles } from "../requests/section-tabs-styles";
import { formatBytes, formatMilliseconds, statusTone } from "./response-format";
import { responseStyles } from "./response-styles";
import "./response-body";
import "./timing-chart";
import "./script-results";

/** The response of the active tab: status, body (pretty / raw / preview), headers and timing. */
export class ResponsePanel extends LitElement {
  static override styles = [formStyles, sectionTabsStyles, responseStyles];
  static override properties = { tab: { attribute: false } };

  declare tab: RequestTab;

  constructor() {
    super();
    watch(this, isResponseCollapsed);
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

  private renderMessage(text: string, isError = false): TemplateResult {
    const message = html`<div
      class="message ${isError ? "is-error" : ""}"
      role=${isError ? "alert" : "status"}
    >
      ${isError ? logoIcon(40) : undefined}<span>${text}</span>
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
      ${renderClose()}
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
      title=${withShortcut(isCollapsed ? "Show response" : "Hide response", "Mod+Shift+R")}
      @click=${toggleResponse}
    >
      <span class="chevron">${isCollapsed ? chevronRightIcon() : chevronDownIcon()}</span>Response
    </button>`;
}

/** × on the right: closes the response panel down to its bar (sending, the chevron or the shortcut reopen it). */
function renderClose(): TemplateResult | undefined {
  if (isResponseCollapsed.get()) return undefined;
  return html`<button
    class="close-panel"
    aria-label="Close response"
    title=${withShortcut("Close response", "Mod+Shift+R")}
    @click=${collapseResponse}
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
  return html`<span class="pill ${statusTone(response.status)}"
      >${String(response.status)} ${response.statusText}</span
    >
    <span class="metric">${formatMilliseconds(response.timings.total)}</span>
    <span class="metric">${formatBytes(response.body.size)}</span>
    ${
      response.redirectCount > 0
        ? html`<span class="metric" title=${response.url}>${String(response.redirectCount)} redirects</span>`
        : undefined
    }`;
}
