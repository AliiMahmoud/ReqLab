import { RangeSetBuilder, type Extension } from "@codemirror/state";
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";

export interface JsonProblem {
  from: number;
  to: number;
  /** "Line 3, column 5: Expected ',' or '}' after property value". */
  message: string;
}

/**
 * The first syntax error in a JSON body, if any. {{variables}} count as values (they become text
 * of the same length, a valid number), so `"id": {{userId}}` is fine. Empty text is fine too.
 */
export function findJsonProblem(
  text: string,
): (Omit<JsonProblem, "message"> & { reason: string }) | undefined {
  const masked = text.replace(/\{\{[^{}]*\}\}/g, (variable) => `1${"0".repeat(variable.length - 1)}`);
  if (masked.trim() === "") return undefined;
  try {
    JSON.parse(masked);
    return undefined;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Invalid JSON";
    const position = /at position (\d+)/.exec(raw)?.[1];
    if (position === undefined) return bareWordProblem(masked) ?? endProblem(text, cleanReason(raw));
    const from = Math.max(0, Math.min(Number(position), text.length - 1));
    return { from, to: tokenEnd(text, from), reason: cleanReason(raw) };
  }
}

/**
 * V8 gives no position for a misspelled value (`tru`, `undefined`, `'single'`): point at the first bare
 * word after ":" "[" or "," that is not true / false / null.
 */
function bareWordProblem(masked: string): (Omit<JsonProblem, "message"> & { reason: string }) | undefined {
  for (const match of masked.matchAll(/([:[,]\s*)([A-Za-z_'][\w']*)/g)) {
    const word = match[2] ?? "";
    if (["true", "false", "null"].includes(word)) continue;
    const from = match.index + (match[1] ?? "").length;
    return {
      from,
      to: from + word.length,
      reason: `"${word}" is not a JSON value (use "text", a number, true, false or null)`,
    };
  }
  return undefined;
}

/** Where the token starting at `from` ends: a whole "string" or word, so the underline is easy to see. */
function tokenEnd(text: string, from: number): number {
  const quoted = text[from] === '"' ? /^"(?:[^"\\\n]|\\.)*"?/.exec(text.slice(from)) : null;
  const word = /^[^\s,:{}[\]]+/.exec(text.slice(from));
  const length = quoted?.[0].length ?? word?.[0].length ?? 1;
  return Math.min(from + Math.max(length, 1), text.length);
}

function endProblem(text: string, reason: string): Omit<JsonProblem, "message"> & { reason: string } {
  const from = Math.max(0, text.length - 1);
  return { from, to: text.length, reason };
}

/** V8's message without the "in JSON at position N (line X column Y)" tail, which the UI shows its own way. */
function cleanReason(raw: string): string {
  const reason = raw
    .replace(/\s*(in JSON )?at position \d+.*$/s, "")
    .replace(/, ".*" is not valid JSON$/s, "")
    .replace(/^JSON\.parse: /, "");
  return /^Unexpected end/.test(reason)
    ? 'The JSON ends too early (a closing } or ] or " is missing)'
    : reason;
}

const errorMark = (message: string): Decoration =>
  Decoration.mark({ class: "cm-json-error", attributes: { title: message } });
const errorLine = Decoration.line({ class: "cm-json-error-line" });

/** Tints the line of the first JSON error and underlines it in red; hovering shows why. */
export function jsonChecker(): Extension {
  const check = (view: EditorView): DecorationSet => {
    const found = findJsonProblem(view.state.doc.toString());
    if (found === undefined) return Decoration.none;
    const line = view.state.doc.lineAt(found.from);
    const message = `Line ${String(line.number)}, column ${String(found.from - line.from + 1)}: ${found.reason}`;
    const builder = new RangeSetBuilder<Decoration>();
    builder.add(line.from, line.from, errorLine);
    if (found.to > found.from) builder.add(found.from, found.to, errorMark(message));
    return builder.finish();
  };
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = check(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged) this.decorations = check(update.view);
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}
