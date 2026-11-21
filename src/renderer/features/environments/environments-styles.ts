import { css } from "lit";

export const environmentsStyles = css`
  :host {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    min-height: 0;
    overflow: auto;
  }
  aside {
    flex: 1 1 240px;
    max-width: 260px;
    min-width: 200px;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .group {
    color: var(--color-text-faint);
    font-size: calc(11px * var(--text-scale));
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: var(--space-2) var(--space-2) var(--space-1);
  }
  .owner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border: none;
    text-align: start;
    background: transparent;
    font-size: calc(13px * var(--text-scale));
  }
  .owner[aria-current="true"] {
    background: var(--color-selected);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 99px;
    flex: none;
  }
  .dot.is-empty {
    border: 1.5px solid var(--color-checkbox-border);
  }
  .owner .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .active-mark {
    font-family: var(--font-code);
    font-size: calc(10.5px * var(--text-scale));
    color: var(--color-success);
  }
  .new {
    margin-top: var(--space-2);
    border: 1px dashed var(--color-field-border);
    background: transparent;
    color: var(--color-text-muted);
    text-align: start;
    padding: 9px 10px;
  }
  .note {
    margin-top: auto;
    padding: 10px 8px;
    color: var(--color-text-faint);
    font-size: calc(11.5px * var(--text-scale));
    line-height: 1.5;
  }
  main {
    flex: 999 1 640px;
    min-width: 0;
    padding: var(--space-6) 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .title-row {
    display: flex;
    align-items: flex-end;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  .title-row > div {
    flex: 1;
    min-width: 240px;
  }
  h1 {
    margin: 0;
    font-size: calc(20px * var(--text-scale));
    font-weight: 600;
  }
  h1 input {
    font-size: calc(20px * var(--text-scale));
    font-weight: 600;
    padding: 2px 6px;
    margin-left: -7px;
    background: transparent;
    border-color: transparent;
    width: 100%;
  }
  h1 input:hover,
  h1 input:focus {
    border-color: var(--color-field-border);
  }
  .subtitle {
    color: var(--color-text-muted);
    font-size: calc(12px * var(--text-scale));
    margin-top: var(--space-1);
    font-family: var(--font-code);
  }
  .cards {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  .card {
    flex: 1 1 300px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-large);
    padding: 14px var(--space-4);
    background: var(--color-surface);
    display: grid;
    gap: 6px;
    align-content: start;
  }
  .card strong {
    font-weight: 600;
  }
  .card p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: calc(12.5px * var(--text-scale));
    line-height: 1.6;
  }
  .card input {
    font-family: var(--font-code);
    font-size: calc(12px * var(--text-scale));
  }
  .resolved {
    font-family: var(--font-code);
    font-size: calc(12px * var(--text-scale));
    color: var(--color-text-faint);
    word-break: break-all;
  }
  .protect {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-danger);
    font-size: calc(12.5px * var(--text-scale));
    cursor: pointer;
  }
  .save-state {
    min-height: 16px;
    margin: 0;
    color: var(--color-text-faint);
    font-size: calc(12px * var(--text-scale));
  }
`;
