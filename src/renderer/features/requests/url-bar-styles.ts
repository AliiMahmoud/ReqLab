import { css } from "lit";

/** The input's text is transparent; the coloured copy behind it shows through, caret and all aligned. */
export const urlBarStyles = css`
  :host {
    display: flex;
    gap: var(--space-2);
    padding: 14px var(--space-4);
    flex-wrap: wrap;
    flex: none;
  }
  .field {
    flex: 1 1 420px;
    display: flex;
    border: 1px solid var(--color-field-border);
    border-radius: var(--radius-large);
    background: var(--color-raised);
  }
  .field:focus-within {
    border-color: var(--color-accent);
  }
  label {
    display: flex;
  }
  .url {
    flex: 1;
    position: relative;
    min-width: 0;
  }
  .url input,
  .highlight {
    font-family: var(--font-code);
    font-size: 12.5px;
    line-height: 16px;
    padding: 9px 12px;
    white-space: pre;
    letter-spacing: normal;
  }
  .url input {
    position: relative;
    width: 100%;
    border: none;
    border-radius: 0;
    background: transparent;
    color: transparent;
    caret-color: var(--color-text);
  }
  /* Translucent, so the coloured copy behind the transparent text stays readable when selected. */
  .url input::selection {
    background: var(--syntax-selection);
  }
  .url input::placeholder {
    color: var(--color-text-faint);
  }
  .url input:focus-visible {
    outline: none;
  }
  .highlight {
    position: absolute;
    inset: 0;
    overflow: hidden;
    color: var(--color-text);
    pointer-events: none;
  }
  .variable {
    color: var(--color-variable);
    background: var(--color-variable-background);
    border-radius: 3px;
    box-shadow: 0 0 0 2px var(--color-variable-background);
  }
  .variable.is-missing {
    color: var(--color-variable-missing);
    background: var(--color-variable-missing-background);
    box-shadow: 0 0 0 2px var(--color-variable-missing-background);
  }
  .send {
    align-self: center;
    height: 36px;
    min-width: 72px;
    padding: 0 16px;
    border-radius: var(--radius-large);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .tls-off {
    align-self: center;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--color-warning-background);
    color: var(--color-warning);
    font-family: var(--font-code);
    font-size: 11px;
    white-space: nowrap;
  }
  button.icon.curl {
    align-self: center;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: var(--radius-large);
    color: var(--color-text-strong-muted);
    transition:
      color 120ms ease,
      border-color 120ms ease,
      background-color 120ms ease;
  }
  button.icon.curl:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
  button.icon.curl.is-copied {
    color: var(--color-success);
    border-color: var(--color-success);
  }
`;
