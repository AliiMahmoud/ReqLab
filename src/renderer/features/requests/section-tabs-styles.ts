import { css } from "lit";

/** The underlined sub-tabs used by the request editor and the response panel. */
export const sectionTabsStyles = css`
  .section-tabs {
    display: flex;
    gap: 2px;
    padding: 0 var(--space-3);
    border-bottom: 1px solid var(--color-border);
    overflow-x: auto;
    flex: none;
  }
  .section-tabs button {
    padding: 10px;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-muted);
    white-space: nowrap;
  }
  .section-tabs button:hover:not(:disabled) {
    background: transparent;
    color: var(--color-text);
  }
  .section-tabs button[aria-selected="true"] {
    color: var(--color-text);
    border-bottom-color: var(--color-accent);
  }
  .count {
    color: var(--color-text-faint);
    font-size: calc(11px * var(--text-scale));
    margin-left: var(--space-1);
  }
  /* "This section is set": a small green dot after the label, as in Postman. */
  .has-content {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-left: 6px;
    border-radius: 50%;
    background: var(--color-success);
    vertical-align: middle;
    transform: translateY(-1px);
  }
  .chips {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding: 10px var(--space-3);
    color: var(--color-text-muted);
    font-size: calc(12px * var(--text-scale));
    flex-wrap: wrap;
  }
  .chips button {
    padding: 3px 8px;
    border: none;
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--color-text-muted);
    font-size: calc(12px * var(--text-scale));
  }
  .chips button[aria-pressed="true"] {
    background: var(--color-selected);
    color: var(--color-text);
  }
  .spacer {
    flex: 1;
  }
  .placeholder {
    padding: var(--space-4);
    color: var(--color-text-faint);
    line-height: 1.6;
  }
`;
