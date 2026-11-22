import { css, html, type TemplateResult } from "lit";
import { knownVariableNames } from "../stores/environment-store";

const VARIABLE_PART = /(\{\{[^{}]+\}\})/;
const ANY_VARIABLE = /\{\{[^{}]+\}\}/;

export function hasVariables(text: string): boolean {
  return ANY_VARIABLE.test(text);
}

/** The text with each {{name}} wrapped: amber when defined, red when nothing defines it. */
export function renderVariableText(text: string): TemplateResult[] {
  const names = knownVariableNames.get();
  return text.split(VARIABLE_PART).map((part) => {
    if (!VARIABLE_PART.test(part)) return html`${part}`;
    const isKnown = names.has(part.slice(2, -2).trim());
    return html`<span class="variable ${isKnown ? "" : "is-missing"}">${part}</span>`;
  });
}

/**
 * The coloured copy of a field's text, drawn exactly over it (the field's own text turns transparent
 * while there is a {{variable}}). Put it right after the <input> inside a `.variable-field`.
 * Components using it must watch `knownVariableNames`.
 */
export function variableOverlay(value: string): TemplateResult | undefined {
  if (!hasVariables(value)) return undefined;
  return html`<span class="variable-overlay" aria-hidden="true"
    ><span>${renderVariableText(value)}</span></span
  >`;
}

/** Keeps the overlay scrolled with a long value, sideways and (in a text box) down. Attach to input / scroll / keyup / select. */
export function syncVariableOverlay(event: Event): void {
  const input = event.target as HTMLInputElement;
  const overlay = input.nextElementSibling;
  if (overlay instanceof HTMLElement && overlay.classList.contains("variable-overlay")) {
    overlay.scrollLeft = input.scrollLeft;
    overlay.scrollTop = input.scrollTop;
  }
}

/**
 * Hosts set --variable-overlay-padding and --variable-overlay-border to match their inputs, so the
 * coloured text lines up with the caret and selection.
 */
export const variableFieldStyles = css`
  .variable-field {
    position: relative;
    display: block;
    min-width: 0;
  }
  .variable-field > .has-variables {
    color: transparent;
    caret-color: var(--color-text);
  }
  .variable-field > .has-variables::selection {
    background: var(--syntax-selection);
  }
  .variable-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    overflow: hidden;
    padding: var(--variable-overlay-padding, 0 10px);
    border: var(--variable-overlay-border, 0px) solid transparent;
    font-family: var(--font-code);
    font-size: calc(12.5px * var(--text-scale));
    color: var(--color-text);
    white-space: pre;
    pointer-events: none;
  }
  .variable-overlay > span {
    flex: none;
  }
  /* The same chip as in the URL bar. */
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
`;
