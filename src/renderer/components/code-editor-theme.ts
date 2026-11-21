import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/** CodeMirror in the design's colours: same tokens as the response viewer. */
export const codeEditorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      fontSize: "calc(12.5px * var(--text-scale))",
      color: "var(--color-text-soft)",
      backgroundColor: "transparent",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: "var(--font-code)", lineHeight: "1.7" },
    ".cm-content": { caretColor: "var(--color-text)", padding: "4px 0 16px" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-text)" },
    ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "var(--color-gutter)" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 16px" },
    ".cm-foldGutter .cm-gutterElement": {
      padding: "0 4px",
      cursor: "pointer",
      color: "var(--color-text-faint)",
    },
    ".cm-activeLine": { backgroundColor: "var(--color-hover-tint)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--color-text-muted)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--syntax-selection) !important",
    },
    ".cm-matchingBracket": {
      backgroundColor: "var(--color-selected)",
      outline: "1px solid var(--color-checkbox-border)",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--color-selected)",
      border: "none",
      color: "var(--color-text-muted)",
      padding: "0 6px",
      margin: "0 2px",
    },
    ".cm-placeholder": { color: "var(--color-text-faint)" },
    // Suggestions (scripts): in the app's colours instead of CodeMirror's defaults.
    ".cm-tooltip.cm-tooltip-autocomplete": {
      maxWidth: "min(320px, 90vw)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-small)",
      background: "var(--color-raised)",
      boxShadow: "var(--shadow-popup)",
      overflow: "hidden",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-code)", maxHeight: "16em" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
      padding: "3px 10px",
      color: "var(--color-text)",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      background: "var(--color-selected)",
      color: "var(--color-text)",
    },
    ".cm-completionDetail": { marginLeft: "12px", color: "var(--color-text-faint)", fontStyle: "normal" },
    // runRequest suggestions: coloured method and name, the full path small underneath.
    ".cm-request-option .cm-completionLabel": { display: "none" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li.cm-request-option": { padding: "5px 12px" },
    ".cm-request-row": {
      display: "flex",
      flexDirection: "column",
      gap: "1px",
      minWidth: "0",
      fontFamily: "var(--font-ui)",
    },
    ".cm-request-title": { display: "flex", alignItems: "baseline", gap: "8px", minWidth: "0" },
    ".cm-request-method": {
      fontSize: "calc(11px * var(--text-scale))",
      fontWeight: "700",
      letterSpacing: "0.02em",
    },
    // Long names and paths end in "…" instead of widening the list.
    ".cm-request-name": {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    ".cm-request-path": {
      fontSize: "calc(11px * var(--text-scale))",
      color: "var(--color-text-faint)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    ".cm-completionMatchedText": { textDecoration: "none", color: "var(--color-accent)", fontWeight: "600" },
    // Line and word highlights are see-through: the selection is drawn beneath the text and must show.
    ".cm-json-error-line": { backgroundColor: "color-mix(in srgb, var(--color-danger) 9%, transparent)" },
    ".cm-json-error": {
      textDecoration: "underline wavy var(--color-danger)",
      textDecorationSkipInk: "none",
      textUnderlineOffset: "3px",
      backgroundColor: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
    },
    // {{variables}} win over the syntax colour of the string or token they sit in.
    ".cm-variable, .cm-variable *": { color: "var(--color-variable) !important" },
    ".cm-variable": {
      backgroundColor: "color-mix(in srgb, var(--color-variable) 14%, transparent)",
      borderRadius: "3px",
    },
    ".cm-variable-missing, .cm-variable-missing *": { color: "var(--color-variable-missing) !important" },
    ".cm-variable-missing": {
      backgroundColor: "color-mix(in srgb, var(--color-variable-missing) 12%, transparent)",
    },
  },
  // Colours come from the theme tokens, so one editor theme serves light and dark.
);

export const codeHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--syntax-key)" },
  { tag: tags.string, color: "var(--syntax-string)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--syntax-literal)" },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: "var(--syntax-punctuation)" },
  { tag: [tags.tagName, tags.angleBracket], color: "var(--syntax-key)" },
  { tag: tags.attributeName, color: "var(--color-variable)" },
  { tag: tags.attributeValue, color: "var(--syntax-string)" },
  { tag: [tags.comment, tags.processingInstruction, tags.documentMeta], color: "var(--color-text-faint)" },
  { tag: tags.invalid, color: "var(--color-danger)" },
  // Scripts (JavaScript).
  {
    tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.operatorKeyword, tags.modifier],
    color: "var(--syntax-literal)",
  },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--syntax-key)" },
  { tag: tags.regexp, color: "var(--syntax-string)" },
]);
