import type { Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { methodColor } from "./method-colors";
import { savedRequests, type SavedRequest } from "./saved-requests";

const REQUEST_ID = /["']([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["']/gi;

/** Shown instead of a quoted request ID: its method (coloured) and name. Double-click to see and edit the ID. */
class RequestChip extends WidgetType {
  constructor(private readonly request: SavedRequest) {
    super();
  }

  override eq(other: RequestChip): boolean {
    const { id, name, method } = this.request;
    return other.request.id === id && other.request.name === name && other.request.method === method;
  }

  toDOM(view: EditorView): HTMLElement {
    const chip = document.createElement("span");
    chip.className = "cm-request-chip";
    const method = document.createElement("span");
    method.className = "cm-request-chip-method";
    method.textContent = this.request.method.toUpperCase();
    method.style.color = methodColor(this.request.method);
    chip.append(method, this.request.name);
    chip.title = `${this.request.name} (${this.request.id}) — double-click to edit the ID`;
    chip.addEventListener("dblclick", (event) => {
      event.preventDefault();
      // The cursor inside the ID shows it as text (see labelsIn).
      view.dispatch({ selection: { anchor: view.posAtDOM(chip) + 1 } });
      view.focus();
    });
    return chip;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

/** After an ID being edited (or one that matches no request): the request's name, or a warning. */
class RequestLabel extends WidgetType {
  constructor(private readonly request: SavedRequest | undefined) {
    super();
  }

  override eq(other: RequestLabel): boolean {
    return other.request?.id === this.request?.id && other.request?.name === this.request?.name;
  }

  toDOM(): HTMLElement {
    const label = document.createElement("span");
    label.className = this.request === undefined ? "cm-request-label is-unknown" : "cm-request-label";
    label.textContent = this.request === undefined ? "no such request" : this.request.name;
    return label;
  }
}

/** Each quoted request ID: its name as a chip, or (cursor on it, or unknown) the ID with a label after. */
function labelsIn(view: EditorView): DecorationSet {
  const requests = new Map(savedRequests().map((request) => [request.id, request]));
  const decorations = view.visibleRanges.flatMap(({ from, to }) =>
    [...view.state.doc.sliceString(from, to).matchAll(REQUEST_ID)].map((match) => {
      const start = from + match.index;
      return decorationFor(view, {
        start,
        end: start + match[0].length,
        request: requests.get((match[1] ?? "").toLowerCase()),
      });
    }),
  );
  return Decoration.set(decorations, true);
}

function decorationFor(
  view: EditorView,
  found: { start: number; end: number; request: SavedRequest | undefined },
): Range<Decoration> {
  const { start, end, request } = found;
  const isEditing = view.state.selection.ranges.some((range) => range.from <= end && range.to >= start);
  if (request !== undefined && !isEditing)
    return Decoration.replace({ widget: new RequestChip(request) }).range(start, end);
  return Decoration.widget({ widget: new RequestLabel(request), side: 1 }).range(end);
}

/** Request IDs in scripts read as request names; the ID shows while the cursor is on it. */
export const requestIdLabels = [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = labelsIn(view);
      }
      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged || update.selectionSet)
          this.decorations = labelsIn(update.view);
      }
    },
    { decorations: (plugin) => plugin.decorations },
  ),
  EditorView.baseTheme({
    ".cm-request-chip": {
      padding: "1px 7px",
      borderRadius: "4px",
      background: "var(--color-selected)",
      color: "var(--color-text)",
      fontFamily: "var(--font-ui)",
      fontSize: "12px",
      cursor: "pointer",
    },
    ".cm-request-chip-method": { marginRight: "6px", fontSize: "10.5px", fontWeight: "700" },
    ".cm-request-label": {
      marginLeft: "8px",
      padding: "0 6px",
      borderRadius: "4px",
      background: "var(--color-selected)",
      color: "var(--color-text-muted)",
      fontFamily: "var(--font-ui)",
      fontSize: "11px",
    },
    ".cm-request-label.is-unknown": { color: "var(--color-danger)" },
  }),
];
