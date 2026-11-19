import { css } from "lit";

export const variablePopoverStyles = css`
  :host {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 8px);
    background: var(--color-surface-raised, var(--color-surface));
    color: var(--color-text);
    box-shadow: var(--shadow-popup);
    font-size: 12px;
    overflow: hidden;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 4px;
    max-height: 280px;
    overflow-y: auto;
    min-width: 320px;
    max-width: 520px;
  }
  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2px var(--space-3);
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
  }
  li.is-selected {
    background: var(--color-hover-tint);
  }
  .name {
    font-family: var(--font-code);
    color: var(--color-accent);
  }
  .scope {
    color: var(--color-text-faint);
    text-align: right;
  }
  .preview {
    grid-column: 1 / -1;
    color: var(--color-text-muted);
    font-family: var(--font-code);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .card {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    width: 340px;
  }
  .card header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .card header .scope {
    margin-left: auto;
  }
  .go-to {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--color-text-muted);
  }
  .go-to:hover {
    background: var(--color-hover-tint);
    color: var(--color-accent);
  }
  .missing {
    color: var(--color-danger);
  }
  .edit {
    display: flex;
    gap: var(--space-2);
  }
  .edit input {
    flex: 1;
    min-width: 0;
    font-family: var(--font-code);
  }
  .hint {
    color: var(--color-text-faint);
    margin: 0;
  }
`;
