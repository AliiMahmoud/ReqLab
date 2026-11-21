import { css } from "lit";

/** Modal dialogs: workspace actions, import and export. */
export const dialogStyles = css`
  /* The host only holds a closed <dialog>: it must not take up room in its parent's layout. */
  :host {
    display: contents;
  }
  dialog {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-large);
    background: var(--color-surface);
    color: var(--color-text);
    width: min(460px, calc(100% - 32px));
    padding: 20px;
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 55%);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
  .files {
    margin: 0;
    padding: var(--space-2) var(--space-3);
    list-style: none;
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius);
    font-family: var(--font-code);
    font-size: calc(12px * var(--text-scale));
    color: var(--color-text-soft);
    max-height: 120px;
    overflow-y: auto;
  }
  .counts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: var(--space-2);
  }
  .count {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius);
  }
  .count strong {
    display: block;
    font-size: calc(18px * var(--text-scale));
  }
  .warnings {
    margin: 0;
    padding-left: var(--space-4);
    max-height: 180px;
    overflow-y: auto;
    color: var(--color-warning);
    font-size: calc(12px * var(--text-scale));
    line-height: 1.6;
  }
  .checkbox {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }
`;
