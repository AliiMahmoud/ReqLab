import { historyField } from "@codemirror/commands";
import { EditorState, type Extension } from "@codemirror/state";

/** How many editors' states are kept (one per tab and editor, e.g. a request's body); oldest go first. */
const MAX_KEPT = 100;

/** Each editor's text, cursor and undo history, by key, kept while the editor is not on screen. */
const kept = new Map<string, unknown>();

/**
 * Remembers an editor's state, so its undo history survives the editor being rebuilt (JSON → form →
 * JSON, another tab and back, the Environments page and back). Memory only.
 */
export function keepEditorState(key: string, state: EditorState): void {
  kept.delete(key);
  kept.set(key, state.toJSON({ history: historyField }));
  const oldest = kept.keys().next().value;
  if (kept.size > MAX_KEPT && oldest !== undefined) kept.delete(oldest);
}

/**
 * A fresh state for `value`, with the kept history of `key` when there is one and its text is still
 * `value` (if the text changed meanwhile, e.g. by undo of the whole request, the old history no
 * longer applies).
 */
export function editorStateFor(key: string | undefined, value: string, extensions: Extension[]): EditorState {
  const json = key === undefined ? undefined : kept.get(key);
  if (isStateOf(json, value)) {
    try {
      return EditorState.fromJSON(json, { extensions }, { history: historyField });
    } catch {
      // Kept by an older version of the editor: start afresh.
    }
  }
  return EditorState.create({ doc: value, extensions });
}

function isStateOf(json: unknown, value: string): json is Record<string, unknown> {
  return typeof json === "object" && json !== null && (json as { doc?: unknown }).doc === value;
}
