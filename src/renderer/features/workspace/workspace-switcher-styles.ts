import { css } from "lit";

/** The header's workspace dropdown (left side, as in Postman) and its "+" button. */
export const workspaceSwitcherStyles = css`
  :host {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .trigger {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    max-width: 260px;
    padding: 6px 12px;
    border-color: transparent;
    background: transparent;
    font-size: calc(15px * var(--text-scale));
    font-weight: 600;
  }
  .trigger[aria-expanded="true"],
  .trigger:hover:not(:disabled) {
    background: var(--color-raised);
    border-color: var(--color-field-border);
  }
  .trigger .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chevron {
    display: inline-flex;
    color: var(--color-text-faint);
  }
  .add {
    width: 28px;
    height: 28px;
  }
  .popup {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 30;
    width: 280px;
    padding: var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-large);
    background: var(--color-surface);
    box-shadow: var(--shadow-popup);
  }
  .group {
    padding: var(--space-2) 10px var(--space-1);
    color: var(--color-text-faint);
    font-size: calc(11px * var(--text-scale));
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  /* "Workspaces" with Import and Export at its right. */
  .group.heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 4px;
    padding-bottom: 2px;
  }
  .heading-actions {
    display: flex;
    gap: 2px;
    text-transform: none;
    letter-spacing: normal;
  }
  .heading-action {
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
  }
  .heading-action:hover:not(:disabled) {
    background: var(--color-hover-tint);
    color: var(--color-text);
  }
  .list {
    max-height: 320px;
    overflow-y: auto;
  }
  .item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: 7px 10px;
    border: none;
    background: transparent;
    text-align: start;
  }
  .item .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item .mark {
    display: inline-flex;
    color: var(--color-text-muted);
  }
  .item.danger {
    color: var(--color-danger);
  }
  hr {
    margin: var(--space-1) 0;
    border: none;
    border-top: 1px solid var(--color-border-soft);
  }
`;
