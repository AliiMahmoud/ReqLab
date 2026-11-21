import { css } from "lit";

/** A Postman-style grid: bordered cells, borderless inputs, a header row, delete on hover. */
export const keyValueTableStyles = css`
  :host {
    display: block;
    padding: var(--space-2) var(--space-3) var(--space-3);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 30px;
    margin-bottom: var(--space-1);
    color: var(--color-text-muted);
    font-size: calc(12px * var(--text-scale));
  }
  .bar .spacer {
    flex: 1;
  }
  .link {
    padding: 2px 6px;
    border: none;
    background: transparent;
    color: var(--color-link);
    font-size: calc(12px * var(--text-scale));
  }
  .link:hover:not(:disabled) {
    background: transparent;
    color: var(--color-accent-hover);
  }
  .table {
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .row {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1fr) 34px;
    border-bottom: 1px solid var(--color-border);
  }
  .row:last-child {
    border-bottom: none;
  }
  .row > * {
    min-height: var(--row-height);
    border-right: 1px solid var(--color-border);
  }
  .row > *:last-child {
    border-right: none;
  }
  .row:hover:not(.head) {
    background: var(--color-hover-tint);
  }
  .head > * {
    display: flex;
    align-items: center;
    padding: 0 10px;
    min-height: calc(var(--row-height) - 2px);
    color: var(--color-text-faint);
    font-size: calc(11px * var(--text-scale));
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-surface);
  }
  .check {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cell {
    width: 100%;
    height: 100%;
    padding: 0 10px;
    border: none;
    border-radius: 0;
    background: transparent;
    font-family: var(--font-code);
    font-size: calc(12.5px * var(--text-scale));
  }
  /* A value that may span lines grows with its content (no scroll bar, no resize handle). Its
     first line sits where a one-line cell's text would, whatever the row height. */
  .is-multiline {
    --multiline-padding: max(2px, calc((var(--row-height) - 16px * var(--text-scale)) / 2));
  }
  textarea.cell {
    display: block;
    min-height: var(--row-height);
    padding: var(--multiline-padding) 10px;
    line-height: calc(16px * var(--text-scale));
    resize: none;
    field-sizing: content;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .is-multiline .variable-overlay {
    align-items: flex-start;
    padding: var(--multiline-padding) 10px;
    line-height: calc(16px * var(--text-scale));
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .is-multiline .variable-overlay > span {
    flex: 1;
    min-width: 0;
  }
  .cell:focus-visible {
    outline: none;
    background: var(--color-field);
    box-shadow: inset 0 0 0 1px var(--color-accent);
  }
  .cell::placeholder {
    color: var(--color-text-faint);
  }
  .is-off .cell,
  .is-off .variable-overlay {
    color: var(--color-text-faint);
  }
  .is-off .variable-overlay {
    opacity: 0.6;
  }
  /* The delete cell centres its bin button both ways. */
  .actions {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: min(26px, var(--row-height));
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-faint);
    visibility: hidden;
  }
  .row:hover .remove,
  .remove:focus-visible {
    visibility: visible;
  }
  /* Only the bin itself turns red on hover; no background. */
  .remove:hover:not(:disabled) {
    background: transparent;
    color: var(--color-danger);
  }
  code-area {
    min-height: 180px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }
`;
