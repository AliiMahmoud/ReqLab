import { css, html, LitElement, type TemplateResult } from "lit";
import { safeStyle } from "../../directives/safe-style";
import type { Timings } from "@shared/models/http-exchange";
import { formatMilliseconds } from "./response-format";

/** Each phase as a bar on a shared time axis (a waterfall), with exact numbers beside it. */
export class TimingChart extends LitElement {
  static override styles = css`
    :host {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      font-family: var(--font-code);
      font-size: 12px;
    }
    .phase {
      display: grid;
      grid-template-columns: 90px 1fr 70px;
      align-items: center;
      gap: var(--space-3);
      color: var(--color-text-muted);
    }
    .track {
      position: relative;
      height: 10px;
      background: var(--color-border-soft);
      border-radius: 2px;
    }
    .bar {
      position: absolute;
      top: 0;
      bottom: 0;
      min-width: 2px;
      border-radius: 2px;
      background: var(--color-accent);
    }
    .value {
      text-align: right;
      color: var(--color-text-soft);
    }
  `;
  static override properties = { timings: { attribute: false } };

  declare timings: Timings;

  override render(): TemplateResult {
    const { dns, connect, tls, firstByte, download, total } = this.timings;
    const phases: [string, number | null][] = [
      ["DNS", dns],
      ["Connect", connect],
      ["TLS", tls],
      ["Waiting (TTFB)", firstByte],
      ["Download", download],
    ];
    let offset = 0;
    const rows = phases.map(([label, duration]) => {
      const start = offset;
      offset += duration ?? 0;
      return this.renderPhase(label, duration, start);
    });
    return html`${rows}${this.renderPhase("Total", total, 0)}`;
  }

  private renderPhase(label: string, duration: number | null, start: number): TemplateResult {
    const total = Math.max(this.timings.total, 0.001);
    const left = (start / total) * 100;
    const width = ((duration ?? 0) / total) * 100;
    return html`<div class="phase">
      <span>${label}</span>
      <span class="track" aria-hidden="true">
        ${duration === null ? undefined : html`<span class="bar" style=${safeStyle({ left: `${String(left)}%`, width: `${String(width)}%` })}></span>`}
      </span>
      <span class="value">${formatMilliseconds(duration)}</span>
    </div>`;
  }
}

customElements.define("timing-chart", TimingChart);

declare global {
  interface HTMLElementTagNameMap {
    "timing-chart": TimingChart;
  }
}
