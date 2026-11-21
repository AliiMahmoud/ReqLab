import { css, html, LitElement, type TemplateResult } from "lit";
import type { ScriptReport } from "@shared/models/script-report";

const OUTCOME_LABEL = { pass: "PASS", fail: "FAIL", skip: "SKIP" } as const;

function outcomeOf(test: ScriptReport["tests"][number]): keyof typeof OUTCOME_LABEL {
  if (test.skipped === true) return "skip";
  return test.passed ? "pass" : "fail";
}

const PHASE_LABEL = { prerequest: "Pre-request", test: "Post-response" } as const;

/** The Tests tab: pm.test results, then script errors and console output (like Postman's). */
export class ScriptResults extends LitElement {
  static override styles = css`
    :host {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: var(--space-3) var(--space-4);
      font-size: calc(12.5px * var(--text-scale));
    }
    h3 {
      margin: 14px 0 6px;
      color: var(--color-text-muted);
      font-size: calc(11px * var(--text-scale));
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    h3:first-child {
      margin-top: 0;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 4px;
    }
    li {
      display: grid;
      grid-template-columns: 96px 1fr;
      gap: var(--space-2);
      align-items: baseline;
    }
    .badge {
      justify-self: start;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: calc(11px * var(--text-scale));
      font-weight: 600;
    }
    .pass {
      color: var(--color-success);
      background: var(--color-success-background);
    }
    .fail {
      color: var(--color-danger);
      background: var(--color-danger-background);
    }
    .skip {
      color: var(--color-text-muted);
      background: var(--color-selected);
    }
    .detail {
      display: block;
      color: var(--color-text-muted);
    }
    .log {
      font-family: var(--font-code);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .log.warn {
      color: var(--color-warning);
    }
    .log.error,
    .error {
      color: var(--color-danger);
    }
    .phase {
      color: var(--color-text-faint);
    }
    .empty {
      color: var(--color-text-muted);
    }
  `;
  static override properties = { report: { attribute: false } };

  declare report: ScriptReport | undefined;

  override render(): TemplateResult {
    const report = this.report;
    if (report === undefined)
      return html`<p class="empty">
        No scripts ran for this request. Add them in its Scripts tab, or in its folder's or collection's
        settings.
      </p>`;
    return html`${this.renderTests(report)} ${this.renderErrors(report)} ${this.renderLogs(report)}`;
  }

  private renderTests(report: ScriptReport): TemplateResult {
    if (report.tests.length === 0)
      return html`<h3>Tests</h3>
        <p class="empty">No pm.test in the scripts.</p>`;
    return html`<h3>Tests</h3>
      <ul>
        ${report.tests.map((test) => {
          const kind = outcomeOf(test);
          return html`<li>
            <span class="badge ${kind}">${OUTCOME_LABEL[kind]}</span>
            <span
              >${test.name}${test.error === undefined ? undefined : html`<span class="detail">${test.error}</span>`}</span
            >
          </li>`;
        })}
      </ul>`;
  }

  private renderErrors(report: ScriptReport): TemplateResult | undefined {
    if (report.errors.length === 0) return undefined;
    return html`<h3>Script errors</h3>
      <ul>
        ${report.errors.map(
          (error) =>
            html`<li>
              <span class="phase">${PHASE_LABEL[error.phase]}</span>
              <span class="error">${error.source}: ${error.message}</span>
            </li>`,
        )}
      </ul>`;
  }

  private renderLogs(report: ScriptReport): TemplateResult | undefined {
    if (report.logs.length === 0) return undefined;
    return html`<h3>Console</h3>
      <ul>
        ${report.logs.map(
          (line) =>
            html`<li>
              <span class="phase">${PHASE_LABEL[line.phase]}</span>
              <span class="log ${line.level}">${line.text}</span>
            </li>`,
        )}
      </ul>`;
  }
}

customElements.define("script-results", ScriptResults);

declare global {
  interface HTMLElementTagNameMap {
    "script-results": ScriptResults;
  }
}
