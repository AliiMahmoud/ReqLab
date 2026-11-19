import { css } from "lit";

/** Form controls and buttons shared by every component, in the design's dark style. */
export const formStyles = css`
  :host {
    box-sizing: border-box;
  }
  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
  form {
    display: grid;
    gap: var(--space-3);
  }
  label {
    display: grid;
    gap: var(--space-1);
    color: var(--color-text-muted);
    font-size: 12px;
  }
  input,
  textarea {
    font: inherit;
    font-size: 12.5px;
    padding: 7px 10px;
    border: 1px solid var(--color-field-border);
    border-radius: var(--radius);
    background: var(--color-field);
    color: var(--color-text);
  }
  input:focus-visible,
  textarea:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
  input[type="checkbox"] {
    accent-color: var(--color-accent);
    width: 14px;
    height: 14px;
    margin: 0;
  }
  button {
    font: inherit;
    font-size: 12.5px;
    padding: 7px 14px;
    border: 1px solid var(--color-field-border);
    border-radius: var(--radius);
    background: var(--color-raised);
    color: var(--color-text);
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: var(--color-selected);
  }
  button.primary {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-accent-text);
    font-weight: 600;
  }
  button.primary:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }
  button.danger {
    color: var(--color-danger);
  }
  /* A destructive main action ("Delete forever"): white with red in light, red with white in dark. */
  button.primary.danger {
    background: var(--color-danger-button);
    border-color: var(--color-danger-button-border);
    color: var(--color-danger-button-text);
  }
  button.primary.danger:hover:not(:disabled) {
    background: var(--color-danger-button-hover);
    border-color: var(--color-danger-button-border);
  }
  button.ghost {
    border-color: transparent;
    background: transparent;
    color: var(--color-text-muted);
  }
  button.icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    width: 32px;
    height: 32px;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .error {
    color: var(--color-danger);
  }
  .error:empty {
    display: none;
  }
  .hint {
    color: var(--color-text-faint);
    font-size: 12px;
  }
  .mono {
    font-family: var(--font-code);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`;

/** Reads a text field from a submitted form. */
export function readField(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === "string" ? value : "";
}
