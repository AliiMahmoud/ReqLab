import { css } from "lit";

export const saveRequestDialogStyles = css`
  dialog {
    width: min(560px, calc(100% - 32px));
    padding: 0;
  }
  form {
    display: grid;
  }
  header {
    padding: 16px 20px 0;
    font-size: calc(11px * var(--text-scale));
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-faint);
  }
  .body {
    display: grid;
    gap: var(--space-3);
    padding: 12px 20px 16px;
  }
  .save-to {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: calc(12px * var(--text-scale));
    color: var(--color-text-muted);
  }
  .crumb {
    padding: 2px 4px;
    border: none;
    background: transparent;
    color: var(--color-link);
    font-size: calc(12px * var(--text-scale));
  }
  .crumb:last-child {
    color: var(--color-text);
    font-weight: 600;
  }
  .crumb:hover:not(:disabled) {
    background: var(--color-hover-tint);
  }
  .separator {
    color: var(--color-text-faint);
  }
  .browser {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-large);
    overflow: hidden;
  }
  .browser .search {
    width: 100%;
    border: none;
    border-bottom: 1px solid var(--color-border-soft);
    border-radius: 0;
    padding: 9px 12px;
  }
  .browser .search:focus-visible {
    outline: none;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 4px;
    height: 240px;
    overflow-y: auto;
  }
  li > button,
  li.request,
  li.new {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text);
    font-size: calc(12.5px * var(--text-scale));
    text-align: left;
  }
  li > button:hover {
    background: var(--color-hover-tint);
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .path {
    color: var(--color-text-faint);
    font-size: calc(11.5px * var(--text-scale));
  }
  .kind-icon {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 5px;
    color: var(--color-text-muted);
  }
  .collection .kind-icon {
    background: var(--color-selected);
    color: var(--color-accent);
    font-size: calc(11px * var(--text-scale));
    font-weight: 700;
  }
  .chevron {
    color: var(--color-text-faint);
  }
  li.request {
    color: var(--color-text-faint);
  }
  .method {
    width: 44px;
    font-family: var(--font-code);
    font-size: calc(10.5px * var(--text-scale));
    font-weight: 600;
  }
  .empty {
    padding: 28px 12px;
    color: var(--color-text-faint);
    font-size: calc(12px * var(--text-scale));
    text-align: center;
  }
  li.new input {
    flex: 1;
  }
  footer {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 12px 20px;
    border-top: 1px solid var(--color-border-soft);
  }
  footer .spacer {
    flex: 1;
  }
  .link {
    padding: 4px 6px;
    border: none;
    background: transparent;
    color: var(--color-link);
    font-size: calc(12px * var(--text-scale));
  }
  .primary {
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
