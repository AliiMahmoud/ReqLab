import { css } from "lit";

/**
 * The response's title bar: console, "Response", the section tabs, status, time and size, the
 * buttons. It steps down to fit on one line at the response's width (fit-bar.ts).
 */
export const responseBarStyles = css`
  .status-line {
    /* Drag it to put the response left, right or below the request (response-dock.ts). */
    cursor: grab;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 14px;
    min-height: 40px;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
    font-size: calc(12px * var(--text-scale));
    flex: none;
  }
  .status-line .section-tabs {
    border-bottom: none;
    padding: 0;
  }
  /* When everything does not fit on one line (fit-bar.ts), the bar steps down: compact (less
     space, no "Response" word, the status code only), then tight (no size or redirects either).
     The full status, time and size stay on the status's hover text. */
  .status-line.is-compact,
  .status-line.is-tight {
    gap: 8px;
    padding: 0 10px;
  }
  .is-compact .title-text,
  .is-compact .status-text,
  .is-tight .title-text,
  .is-tight .status-text,
  .is-tight .metric.is-size,
  .is-tight .metric.is-redirects {
    display: none;
  }
  .is-compact .section-tabs button {
    padding: 10px 6px;
  }
  .status-line.is-tight {
    gap: 4px;
  }
  .is-tight .section-tabs button {
    padding: 10px 4px;
  }
  /* The scripts console button, before "Response". */
  .console {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin-left: -6px;
    padding: 0;
    border: none;
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--color-text-muted);
  }
  .console:hover:not(:disabled) {
    background: var(--color-hover-tint);
    color: var(--color-text);
  }
  .title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: -6px;
    padding: 4px 6px;
    border: none;
    background: transparent;
    font-weight: 600;
    font-size: calc(12px * var(--text-scale));
  }
  .close-panel {
    width: 26px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--color-text-faint);
  }
  .close-panel:hover:not(:disabled) {
    background: var(--color-selected);
    color: var(--color-text);
  }
  .title .chevron {
    display: inline-flex;
    color: var(--color-text-faint);
  }
`;
