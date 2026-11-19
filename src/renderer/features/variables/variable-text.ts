/** Text helpers for {{variables}} inside a plain <input>: where they are, and what is under the mouse. */

export interface VariableToken {
  name: string;
  start: number;
  end: number;
}

const TOKEN = /\{\{([^{}]+)\}\}/g;
/** "{{" followed by the start of a name, right before the caret. */
const OPEN_BEFORE_CARET = /\{\{([^{}\s]*)$/;

export function findTokens(text: string): VariableToken[] {
  return [...text.matchAll(TOKEN)].map((match) => ({
    name: (match[1] ?? "").trim(),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

/** The partly typed name after an unclosed "{{" at the caret, with where the "{{" starts. */
export function openVariableAtCaret(input: HTMLInputElement): { prefix: string; start: number } | undefined {
  const caret = input.selectionStart ?? input.value.length;
  if (caret !== (input.selectionEnd ?? caret)) return undefined;
  const match = OPEN_BEFORE_CARET.exec(input.value.slice(0, caret));
  if (match === null) return undefined;
  return { prefix: match[1] ?? "", start: match.index };
}

/** Replaces the typed "{{pre" with "{{name}}" (reusing a "}}" already after the caret) and tells the field. */
export function insertVariable(input: HTMLInputElement, start: number, name: string): void {
  const caret = input.selectionStart ?? input.value.length;
  const after = input.value.slice(caret).replace(/^[^{}\s]*\}\}/, "");
  const inserted = `{{${name}}}`;
  input.value = input.value.slice(0, start) + inserted + after;
  const position = start + inserted.length;
  input.setSelectionRange(position, position);
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
}

let measuringContext: CanvasRenderingContext2D | null | undefined;

/** Horizontal pixel offset of a character position inside the field, in viewport coordinates. */
export function offsetOfIndex(input: HTMLInputElement, index: number): number {
  const style = getComputedStyle(input);
  measuringContext ??= document.createElement("canvas").getContext("2d");
  if (measuringContext === null) return input.getBoundingClientRect().left;
  measuringContext.font = style.font;
  const width = measuringContext.measureText(input.value.slice(0, index)).width;
  const contentLeft =
    input.getBoundingClientRect().left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
  return contentLeft + width - input.scrollLeft;
}

/** The {{variable}} under the mouse pointer, if any. */
export function tokenAtPoint(input: HTMLInputElement, clientX: number): VariableToken | undefined {
  if (input.type === "password") return undefined;
  return findTokens(input.value).find(
    (token) => clientX >= offsetOfIndex(input, token.start) && clientX <= offsetOfIndex(input, token.end),
  );
}
