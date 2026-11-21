import { ensureSyntaxTree, foldable, foldEffect } from "@codemirror/language";
import type { StateEffect } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/** How long Collapse all may spend reading a big document's structure (CodeMirror reads lazily). */
const PARSE_BUDGET_MS = 3_000;

/**
 * Collapse all: reads the whole document first (a large response is otherwise only partly parsed, so
 * only its top got folded), then folds every block at every depth below the outermost one, which
 * stays open so the first level is still visible. Unfolding a block shows its children folded too.
 */
export function foldEverythingInside(view: EditorView): void {
  ensureSyntaxTree(view.state, view.state.doc.length, PARSE_BUDGET_MS);
  // The finished parse reaches the editor state (which folding reads) with the next update.
  view.dispatch({});
  const { state } = view;
  const effects: StateEffect<unknown>[] = [];
  const firstLine = state.doc.line(1);
  const root = foldable(state, firstLine.from, firstLine.to);
  for (let number = root === null ? 1 : 2; number <= state.doc.lines; number += 1) {
    const line = state.doc.line(number);
    const range = foldable(state, line.from, line.to);
    if (range !== null) effects.push(foldEffect.of(range));
  }
  if (effects.length > 0) view.dispatch({ effects });
}
