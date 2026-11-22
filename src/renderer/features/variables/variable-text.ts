import { measureRanges, type TextField } from "./field-geometry";

/** Text helpers for {{variables}} in a field: where they are, and what is under the mouse. */

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
export function openVariableAtCaret(input: TextField): { prefix: string; start: number } | undefined {
  const caret = input.selectionStart ?? input.value.length;
  if (caret !== (input.selectionEnd ?? caret)) return undefined;
  const match = OPEN_BEFORE_CARET.exec(input.value.slice(0, caret));
  if (match === null) return undefined;
  return { prefix: match[1] ?? "", start: match.index };
}

/** Replaces the typed "{{pre" with "{{name}}" (reusing a "}}" already after the caret) and tells the field. */
export function insertVariable(input: TextField, start: number, name: string): void {
  const caret = input.selectionStart ?? input.value.length;
  const after = input.value.slice(caret).replace(/^[^{}\s]*\}\}/, "");
  const inserted = `{{${name}}}`;
  input.value = input.value.slice(0, start) + inserted + after;
  const position = start + inserted.length;
  input.setSelectionRange(position, position);
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
}

/** The {{variable}} under the mouse pointer, if any (on any line of a wrapping text box). */
export function tokenAtPoint(field: TextField, point: { x: number; y: number }): VariableToken | undefined {
  if (field instanceof HTMLInputElement && field.type === "password") return undefined;
  const tokens = findTokens(field.value);
  if (tokens.length === 0) return undefined;
  const boxes = measureRanges(field, tokens);
  return tokens.find((_token, index) =>
    (boxes[index] ?? []).some(
      (box) => point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom,
    ),
  );
}
