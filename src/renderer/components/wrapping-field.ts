import { css, html, type TemplateResult } from "lit";
import { hasVariables, syncVariableOverlay, variableOverlay } from "./variable-highlight";

export interface WrappingField {
  value: string;
  label: string;
  placeholder: string;
  /** Classes for the text box itself, e.g. "cell" in a table. */
  className?: string;
  /** False (a header value, a token): Enter adds nothing and pasted line breaks become spaces. */
  allowsNewLines: boolean;
}

/**
 * A text box for one value, with {{variables}} highlighted. It shows one line, which scrolls
 * sideways; while it is being edited it wraps a long value and grows with it up to six lines,
 * then scrolls, and folds back when left.
 * Hosts include `wrappingFieldStyles` and `variableFieldStyles`, and must watch `knownVariableNames`.
 */
export function renderWrappingField(field: WrappingField, onValue: (value: string) => void): TemplateResult {
  const input = (event: Event): void => {
    const box = event.target as HTMLTextAreaElement;
    if (!field.allowsNewLines && /[\r\n]/.test(box.value)) {
      const caret = box.selectionStart;
      box.value = box.value.replace(/\r\n|\r|\n/g, " ");
      box.setSelectionRange(caret, caret);
    }
    onValue(box.value);
  };
  return html`<span class="variable-field wrapping-field">
    <textarea
      class="${field.className ?? ""} ${hasVariables(field.value) ? "has-variables" : ""}"
      rows="1"
      aria-label=${field.label}
      placeholder=${field.placeholder}
      autocomplete="off"
      spellcheck="false"
      .value=${field.value}
      @input=${input}
      @keydown=${field.allowsNewLines ? undefined : ignorePlainEnter}
      @scroll=${syncVariableOverlay}
      @blur=${showStart}
    ></textarea
    >${variableOverlay(field.value)}</span
  >`;
}

/** Plain Enter adds no line to a one-line value; Cmd/Ctrl+Enter still sends the request. */
function ignorePlainEnter(event: KeyboardEvent): void {
  if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) event.preventDefault();
}

/** Folded back to one line, the box shows the value from its start. */
function showStart(event: FocusEvent): void {
  const box = event.target as HTMLTextAreaElement;
  box.scrollTop = 0;
  box.scrollLeft = 0;
}

/**
 * Hosts may set --wrap-padding-y / --wrap-padding-x to their text boxes' padding, and
 * --variable-overlay-border to their border width, so the coloured copy lines up with the text.
 */
export const wrappingFieldStyles = css`
  /* Not being edited: one line that scrolls sideways, with no scroll bar (a value with line
     breaks shows its first). */
  .wrapping-field > textarea {
    display: block;
    width: 100%;
    max-height: calc(
      16px * var(--text-scale) + 2 * var(--wrap-padding-y, 7px) + 2 * var(--variable-overlay-border, 0px)
    );
    padding: var(--wrap-padding-y, 7px) var(--wrap-padding-x, 10px);
    line-height: calc(16px * var(--text-scale));
    resize: none;
    overflow: auto hidden;
    scrollbar-width: none;
    field-sizing: content;
    white-space: pre;
  }
  .wrapping-field > .variable-overlay {
    align-items: flex-start;
    padding: var(--wrap-padding-y, 7px) var(--wrap-padding-x, 10px);
    line-height: calc(16px * var(--text-scale));
    white-space: pre;
  }
  /* Being edited: the value wrapped; the box grows up to six lines, then scrolls. */
  .wrapping-field:focus-within > textarea {
    max-height: calc(
      6 * 16px * var(--text-scale) + 2 * var(--wrap-padding-y, 7px) + 2 * var(--variable-overlay-border, 0px)
    );
    overflow: hidden auto;
    /* The same room for a scroll bar in the box and its coloured copy, so both wrap alike. */
    scrollbar-gutter: stable;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .wrapping-field:focus-within > .variable-overlay {
    scrollbar-gutter: stable;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .wrapping-field > .variable-overlay > span {
    flex: 1;
    min-width: 0;
  }
`;
