import { css } from "lit";

/** Shared by the General settings groups: group headings, number fields and on/off switches. */
export const settingRowStyles = css`
  .group {
    margin: 18px 0 2px;
    color: var(--color-text-muted);
    font-size: calc(11px * var(--text-scale));
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  /* Small, without the up/down arrows. */
  input.number {
    width: 84px;
    height: 28px;
    padding: 0 8px;
    text-align: right;
    font-family: var(--font-code);
    font-size: calc(12px * var(--text-scale));
    appearance: textfield;
  }
  input.number::-webkit-inner-spin-button,
  input.number::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
  ui-select {
    min-width: 200px;
  }
  /* An on/off switch drawn from a checkbox. */
  input.switch {
    appearance: none;
    position: relative;
    width: 36px;
    height: 20px;
    margin: 0;
    border: none;
    border-radius: 999px;
    background: var(--color-field-border);
    cursor: pointer;
    transition: background-color 120ms ease;
  }
  input.switch::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 2px rgb(0 0 0 / 25%);
    transition: transform 120ms ease;
  }
  input.switch:checked {
    background: var(--color-accent);
  }
  input.switch:checked::after {
    transform: translateX(16px);
  }
`;
