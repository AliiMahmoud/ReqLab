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
    font-size: 12px;
  }
  .bar .spacer {
    flex: 1;
  }
  .link {
    padding: 2px 6px;
    border: none;
    background: transparent;
    color: var(--color-link);
    font-size: 12px;
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
    min-height: 34px;
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
    min-height: 30px;
    color: var(--color-text-faint);
    font-size: 11px;
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
    font-size: 12.5px;
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
    width: 30px;
    height: 30px;
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
