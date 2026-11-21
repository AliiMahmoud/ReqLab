import { css } from "lit";

/** A collection / folder settings tab: title, section tabs, then the section filling the area. */
export const containerSettingsStyles = css`
  :host {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 16px 20px 4px;
  }
  header .icon {
    display: inline-flex;
    color: var(--color-text-muted);
  }
  header strong {
    font-size: calc(15px * var(--text-scale));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  header .status {
    margin-left: auto;
    color: var(--color-text-faint);
    font-size: calc(12px * var(--text-scale));
  }
  [role="tablist"] {
    display: flex;
    gap: var(--space-4);
    padding: 0 20px;
    border-bottom: 1px solid var(--color-border);
  }
  [role="tab"] {
    padding: 12px 2px 10px;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: none;
    color: var(--color-text-muted);
    font: inherit;
    cursor: pointer;
  }
  [role="tab"][aria-selected="true"] {
    border-bottom-color: var(--color-accent);
    color: var(--color-text);
  }
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-height: 0;
    padding: 16px 20px;
    overflow: auto;
  }
  .hint {
    margin: 0;
    color: var(--color-text-muted);
    font-size: calc(12.5px * var(--text-scale));
  }
  scripts-editor {
    flex: 1;
  }
`;
