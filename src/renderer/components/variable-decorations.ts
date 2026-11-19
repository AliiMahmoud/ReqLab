import { StateEffect, type Extension } from "@codemirror/state";
import {
  Decoration,
  MatchDecorator,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";

/** Dispatch this when the known variable names change, so every {{name}} is recoloured. */
export const refreshVariableColours = StateEffect.define();

/** Colours {{name}} in a CodeMirror editor: amber when `isKnown(name)`, red otherwise. Visible lines only. */
export function variableHighlighter(isKnown: (name: string) => boolean): Extension {
  const decorator = new MatchDecorator({
    regexp: /\{\{([^{}]+)\}\}/g,
    decoration: (match) =>
      Decoration.mark({
        class: isKnown((match[1] ?? "").trim()) ? "cm-variable" : "cm-variable cm-variable-missing",
      }),
  });
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }

      update(update: ViewUpdate): void {
        const isRefresh = update.transactions.some((transaction) =>
          transaction.effects.some((effect) => effect.is(refreshVariableColours)),
        );
        this.decorations = isRefresh
          ? decorator.createDeco(update.view)
          : decorator.updateDeco(update, this.decorations);
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}
