import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  SearchQuery,
  setSearchQuery,
} from "@codemirror/search";
import type { EditorState } from "@codemirror/state";
import { EditorView, type Panel, type ViewUpdate } from "@codemirror/view";
import { html, render, type TemplateResult } from "lit";
import { chevronDownIcon, chevronUpIcon, closeIcon, searchIcon } from "./icons";

/** Counting stops here, so a huge body never slows typing. */
const MAX_COUNTED = 9_999;

/**
 * The editors' find box (Cmd/Ctrl+F), floating at the top right like a browser's: the field with
 * "3 of 12" inside it, previous / next, close. Searches as you type; Enter / Shift+Enter go to
 * the next / previous match; Escape or a click outside closes it. No replace.
 */
export function createFindPanel(view: EditorView): Panel {
  const bar = document.createElement("div");
  bar.className = "cm-find";
  bar.setAttribute("role", "search");
  render(renderBar(view), bar);
  const input = bar.querySelector("input") as HTMLInputElement;
  const count = bar.querySelector(".cm-find-count") as HTMLElement;
  input.value = getSearchQuery(view.state).search;
  const showCount = (): void => {
    count.textContent = describeMatches(view.state);
  };
  showCount();
  // A press anywhere outside the box closes it (the event path crosses shadow roots).
  const closeOnOutsidePress = (event: PointerEvent): void => {
    if (!event.composedPath().includes(bar)) closeSearchPanel(view);
  };
  return {
    dom: bar,
    top: true,
    mount: () => {
      input.select();
      document.addEventListener("pointerdown", closeOnOutsidePress, { capture: true });
    },
    update: (update: ViewUpdate) => {
      if (update.docChanged || update.selectionSet || update.transactions.some(isQueryChange)) showCount();
    },
    destroy: () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress, { capture: true });
    },
  };
}

function renderBar(view: EditorView): TemplateResult {
  return html`<span class="cm-find-icon">${searchIcon()}</span>
    <span class="cm-find-field">
      <input
        main-field="true"
        aria-label="Find"
        placeholder="Find"
        spellcheck="false"
        @input=${(event: Event) => {
          search(view, (event.target as HTMLInputElement).value);
        }}
        @keydown=${(event: KeyboardEvent) => {
          handleKey(view, event);
        }}
      /><span class="cm-find-count" aria-live="polite"></span>
    </span>
    ${iconButton(chevronUpIcon(), "Previous match (Shift+Enter)", () => {
      step(view, findPrevious);
    })}
    ${iconButton(chevronDownIcon(), "Next match (Enter)", () => {
      step(view, findNext);
    })}
    ${iconButton(closeIcon(), "Close (Escape)", () => {
      close(view);
    })}`;
}

function iconButton(icon: TemplateResult, title: string, run: () => void): TemplateResult {
  return html`<button type="button" class="cm-find-button" title=${title} aria-label=${title} @click=${run}>
    ${icon}
  </button>`;
}

/**
 * Searches as you type: selects the first match from the start of the current one (so typing
 * more keeps it while it still matches), wrapping to the top. CodeMirror's findNext is not used
 * here: it selects the field's text, so the next key typed would replace it.
 */
function search(view: EditorView, text: string): void {
  const query = new SearchQuery({ search: text });
  const from = view.state.selection.main.from;
  const match = query.valid ? firstMatchFrom(view.state, query, from) : undefined;
  view.dispatch({
    effects: [
      setSearchQuery.of(query),
      ...(match === undefined ? [] : [EditorView.scrollIntoView(match.from, { y: "center" })]),
    ],
    selection: match === undefined ? { anchor: from } : { anchor: match.from, head: match.to },
  });
}

function firstMatchFrom(
  state: EditorState,
  query: SearchQuery,
  from: number,
): { from: number; to: number } | undefined {
  const after = query.getCursor(state, from).next();
  if (!after.done) return after.value;
  const wrapped = query.getCursor(state).next();
  return wrapped.done ? undefined : wrapped.value;
}

/** Next / previous match, then the caret back at the end of the typed text (not all selected). */
function step(view: EditorView, command: (view: EditorView) => boolean): void {
  command(view);
  const input = view.dom.querySelector<HTMLInputElement>(".cm-find input");
  input?.setSelectionRange(input.value.length, input.value.length);
}

function handleKey(view: EditorView, event: KeyboardEvent): void {
  if (event.key === "Enter") {
    step(view, event.shiftKey ? findPrevious : findNext);
  } else if (event.key === "Escape") {
    close(view);
  } else {
    return;
  }
  event.preventDefault();
}

function close(view: EditorView): void {
  closeSearchPanel(view);
  view.focus();
}

/** "3 of 12", "No results", or nothing before anything is typed. */
function describeMatches(state: EditorState): string {
  if (!getSearchQuery(state).valid) return "";
  const { total, current } = countMatches(state);
  if (total === 0) return "No results";
  const of = total >= MAX_COUNTED ? `${String(MAX_COUNTED)}+` : String(total);
  return current === 0 ? of : `${String(current)} of ${of}`;
}

/** How many matches there are, and which one is selected (0 when none is). */
function countMatches(state: EditorState): { total: number; current: number } {
  const selection = state.selection.main;
  const cursor = getSearchQuery(state).getCursor(state);
  let total = 0;
  let current = 0;
  for (let match = cursor.next(); !match.done && total < MAX_COUNTED; match = cursor.next()) {
    total += 1;
    if (match.value.from === selection.from && match.value.to === selection.to) current = total;
  }
  return { total, current };
}

function isQueryChange(transaction: ViewUpdate["transactions"][number]): boolean {
  return transaction.effects.some((effect) => effect.is(setSearchQuery));
}
