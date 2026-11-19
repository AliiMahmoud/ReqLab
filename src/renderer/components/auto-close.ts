import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

const BRACKETS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const QUOTES: Record<string, string> = { '"': '"', "'": "'", "`": "`" };

/**
 * Typing an opening bracket or quote also types its partner, with the cursor between them; typing
 * the closing character right before an identical one just steps over it.
 */
export function autoClose({ brackets, quotes }: { brackets: boolean; quotes: boolean }): Extension {
  const pairs: Record<string, string> = { ...(brackets ? BRACKETS : {}), ...(quotes ? QUOTES : {}) };
  const closers = new Set(Object.values(pairs));
  if (Object.keys(pairs).length === 0) return [];
  // CodeMirror calls this with (view, from, to, text).
  return EditorView.inputHandler.of((...[view, from, to, text]: [EditorView, number, number, string]) => {
    if (text.length !== 1 || view.state.readOnly) return false;
    const next = view.state.sliceDoc(to, to + 1);
    if (closers.has(text) && next === text && from === to) {
      view.dispatch({ selection: { anchor: to + 1 }, userEvent: "input.type" });
      return true;
    }
    const closer = pairs[text];
    if (closer === undefined) return false;
    view.dispatch({
      changes: { from, to, insert: text + view.state.sliceDoc(from, to) + closer },
      selection: { anchor: from + 1, head: to + 1 },
      // Counts as typing, so suggestions open (e.g. after "runRequest(").
      userEvent: "input.type",
    });
    return true;
  });
}
