import { css } from "lit";

/** The Network log window: a summary, an error card, one block per exchange and a timeline. */
export const networkLogStyles = css`
  :host {
    display: contents;
  }
  dialog {
    width: min(900px, calc(100% - 32px));
    height: min(760px, calc(100% - 48px));
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-large);
    background: var(--color-surface);
    color: var(--color-text);
  }
  dialog[open] {
    display: flex;
    flex-direction: column;
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 55%);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-soft);
  }
  header strong {
    flex: 1;
  }
  header [aria-pressed="true"] {
    background: var(--color-selected);
  }
  .close {
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
  }
  /* Everything below the header scrolls. */
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--space-3) var(--space-4) var(--space-4);
    display: grid;
    align-content: start;
    gap: var(--space-3);
  }
  code-area {
    flex: 1;
    min-height: 0;
  }
  .summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2) var(--space-3);
    font-size: calc(13px * var(--text-scale));
  }
  .summary .url {
    font-family: var(--font-code);
    word-break: break-all;
  }
  .muted {
    color: var(--color-text-muted);
  }
  .badge {
    padding: 1px 8px;
    border-radius: 999px;
    font-weight: 600;
    font-size: calc(12px * var(--text-scale));
    white-space: nowrap;
  }
  .tone-success {
    color: var(--color-success);
    background: var(--color-success-background);
  }
  .tone-redirect {
    color: var(--color-info);
    background: var(--color-selected);
  }
  .tone-client-error,
  .tone-server-error,
  .tone-failed {
    color: var(--color-danger);
    background: var(--color-danger-background);
  }
  .error-card {
    padding: var(--space-3);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius);
    background: var(--color-danger-background);
    color: var(--color-danger);
    font-size: calc(13px * var(--text-scale));
    line-height: 1.6;
  }
  .error-card code {
    display: block;
    margin-top: var(--space-1);
    font-family: var(--font-code);
    font-size: calc(12px * var(--text-scale));
    word-break: break-word;
  }
  details {
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius);
  }
  details details {
    border: none;
    border-top: 1px solid var(--color-border-soft);
    border-radius: 0;
  }
  summary {
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    font-size: calc(12px * var(--text-scale));
    font-weight: 600;
  }
  summary .muted {
    font-weight: 400;
  }
  .section {
    padding: 0 var(--space-3) var(--space-3);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-code);
    font-size: calc(12px * var(--text-scale));
  }
  td {
    padding: 3px var(--space-2) 3px 0;
    vertical-align: top;
    word-break: break-word;
    user-select: text;
  }
  td:first-child {
    width: 34%;
    color: var(--color-text-muted);
  }
  pre {
    margin: 0;
    max-height: 280px;
    overflow: auto;
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--color-sunken);
    font-family: var(--font-code);
    font-size: calc(12px * var(--text-scale));
    white-space: pre-wrap;
    word-break: break-word;
    user-select: text;
  }
  .timeline td:first-child {
    width: 80px;
    text-align: right;
    padding-right: var(--space-3);
  }
  .timeline .is-failure td {
    color: var(--color-danger);
  }
  .empty {
    color: var(--color-text-muted);
    font-size: calc(12px * var(--text-scale));
    margin: 0;
  }
`;
