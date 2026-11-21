import { css } from "lit";

/**
 * The shared dropdown. Callers restyle the button through ::part(trigger), e.g. the method picker.
 * The list lives in the top layer (popover), so dialogs and scroll areas never clip it.
 */
export const uiSelectStyles = css`
  :host {
    display: inline-flex;
    min-width: 0;
  }
  :host([block]) {
    display: flex;
  }
  .trigger {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 7px 10px;
    border: 1px solid var(--color-field-border);
    border-radius: var(--radius);
    background: var(--color-field);
    color: var(--color-text);
    font: inherit;
    font-size: calc(12.5px * var(--text-scale));
    text-align: start;
    cursor: pointer;
  }
  .trigger:hover {
    border-color: var(--color-checkbox-border);
  }
  .trigger:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
  .trigger .label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chevron {
    display: inline-flex;
    flex: none;
    color: var(--color-text-faint);
    transition: transform 120ms ease;
  }
  .trigger[aria-expanded="true"] .chevron {
    transform: rotate(180deg);
  }
  [popover] {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: var(--space-1);
    max-height: min(320px, 60vh);
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-large);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-popup);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    outline: none;
  }
  li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 7px 10px;
    border-radius: var(--radius-small);
    font-size: calc(12.5px * var(--text-scale));
    white-space: nowrap;
    cursor: pointer;
  }
  li.is-highlighted {
    background: var(--color-selected);
  }
  li .name {
    flex: 1;
  }
  li .check {
    display: inline-flex;
    color: var(--color-text-muted);
    visibility: hidden;
  }
  li[aria-selected="true"] .check {
    visibility: visible;
  }
  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    margin-right: 8px;
    border-radius: 50%;
  }
  /* e.g. "Manage environments" on the "No environment" row. */
  li .row-action {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    margin: -3px -4px -3px 2px;
    padding: 0;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }
  li .row-action:hover {
    background: var(--color-hover-tint);
    color: var(--color-text);
  }
  li.starts-group {
    margin-top: 5px;
    border-top: 1px solid var(--color-border-soft);
    padding-top: 9px;
  }
  .dot.is-empty {
    border: 1.5px solid var(--color-checkbox-border);
  }
`;
