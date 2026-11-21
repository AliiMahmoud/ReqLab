import { css } from "lit";

export const settingsDialogStyles = css`
  dialog {
    width: min(780px, calc(100% - 32px));
    height: min(600px, calc(100% - 48px));
    padding: 0;
    overflow: hidden;
  }
  .frame {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    height: 100%;
  }
  header {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 14px 20px;
    border-bottom: 1px solid var(--color-border-soft);
    /* The title bar moves the window. */
    cursor: move;
    user-select: none;
  }
  header strong {
    font-size: calc(14px * var(--text-scale));
  }
  .close {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
  }
  nav {
    display: grid;
    align-content: start;
    gap: 2px;
    padding: 12px 8px;
    border-right: 1px solid var(--color-border-soft);
    background: var(--color-sunken);
  }
  nav button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-muted);
    text-align: left;
  }
  nav button[aria-current="page"] {
    background: var(--color-selected);
    color: var(--color-text);
    font-weight: 600;
  }
  .content {
    overflow-y: auto;
    padding: 16px 24px 24px;
  }
  h2 {
    margin: 0 0 4px;
    font-size: calc(15px * var(--text-scale));
  }
  .lead {
    margin: 0 0 var(--space-3);
    color: var(--color-text-faint);
    font-size: calc(12px * var(--text-scale));
  }
  .setting {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-4);
    padding: 14px 0;
    border-top: 1px solid var(--color-border-soft);
  }
  .setting .title {
    font-weight: 600;
    font-size: calc(13px * var(--text-scale));
  }
  .setting .hint {
    margin: 2px 0 0;
    color: var(--color-text-faint);
    font-size: calc(12px * var(--text-scale));
  }
  .segmented {
    display: inline-flex;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-sunken);
  }
  .segmented button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-muted);
  }
  .segmented button[aria-pressed="true"] {
    background: var(--color-raised);
    color: var(--color-text);
    box-shadow: 0 1px 2px rgb(0 0 0 / 18%);
  }
`;
