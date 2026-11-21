import { css } from "lit";

/** Rows of the collection tree, as in the design: 12.5 px text, mono method badges. */
export const treeStyles = css`
  :host {
    display: block;
    padding: var(--space-1) var(--space-2);
    font-size: calc(13.5px * var(--text-scale));
    overflow-y: auto;
  }
  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: var(--row-height);
    padding: 0 var(--space-2);
    border-radius: var(--radius);
    color: var(--color-text-soft);
    cursor: pointer;
    user-select: none;
  }
  /* Hover and click: a soft grey shade that fades to the right; no border or outline. */
  .row:hover,
  .row:has(.row-main:focus-visible) {
    background: linear-gradient(90deg, var(--color-selected), transparent 92%);
  }
  .row-main:focus,
  .row-main:focus-visible,
  .actions button:focus-visible {
    outline: none;
  }
  /* Dropping into a collection or folder: outlined, so the target is unmistakable. */
  .row.is-drop-target {
    background: var(--color-raised);
    box-shadow: inset 0 0 0 1px var(--color-accent);
  }
  /* Reordering: a straight amber line just above or below the row (not following its rounded corners). */
  .row.is-drop-before::before,
  .row.is-drop-after::before {
    content: "";
    position: absolute;
    left: 6px;
    right: 6px;
    height: 2px;
    border-radius: 1px;
    background: var(--color-accent);
    pointer-events: none;
  }
  .row.is-drop-before::before {
    top: -1px;
  }
  .row.is-drop-after::before {
    bottom: -1px;
  }
  /* The open request and the selected rows: the same grey, a little stronger and held across the row. */
  .row.is-active,
  .row.is-selected {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-text) 13%, transparent),
      color-mix(in srgb, var(--color-text) 6%, transparent)
    );
  }
  .row.is-container {
    color: var(--color-text-strong-muted);
    font-weight: 500;
  }
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* A request has no chevron: its method starts where a sibling folder's icon starts (12 px chevron + 6 px gap). */
  .row-main.is-request {
    padding-left: 18px;
  }
  /* DELETE / OPTIONS are shortened to DEL / OPT. */
  .method {
    font-family: var(--font-ui);
    font-variant-numeric: tabular-nums;
    font-size: calc(10.5px * var(--text-scale));
    font-weight: 600;
    /* As wide as the method itself: the name follows right after it. */
    flex: none;
  }
  .actions {
    display: none;
    gap: 2px;
  }
  .row:hover .actions,
  .row:focus-within .actions {
    display: flex;
  }
  .actions button {
    width: 22px;
    height: 22px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--color-text-faint);
    font-size: calc(11px * var(--text-scale));
  }
  .actions button {
    border-radius: 5px;
  }
  .actions button:hover {
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
  }
  input.rename {
    flex: 1;
    padding: 2px 6px;
    font-size: calc(13.5px * var(--text-scale));
  }
  .empty {
    padding: var(--space-3);
    color: var(--color-text-faint);
    line-height: 1.5;
  }
`;

/** The clickable part of a row; action buttons sit beside it (buttons cannot nest). */
export const rowButtonStyles = css`
  .row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 0;
    border: none;
    background: transparent;
    color: inherit;
    font-weight: inherit;
    text-align: start;
  }
  .row-main:hover:not(:disabled) {
    background: transparent;
  }
`;
