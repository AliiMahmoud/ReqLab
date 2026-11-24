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
    // The find box (Cmd/Ctrl+F, find-panel.ts): a small card floating over the text, top right.
    ".cm-panels.cm-panels-top": {
      position: "absolute",
      top: "8px",
      right: "16px",
      left: "auto",
      zIndex: "5",
      border: "none",
      backgroundColor: "transparent",
    },
    ".cm-find": {
      display: "flex",
      alignItems: "center",
      gap: "2px",
      padding: "4px 4px 4px 10px",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-large)",
      backgroundColor: "var(--color-raised)",
      boxShadow: "var(--shadow-popup)",
      fontFamily: "var(--font-ui)",
      color: "var(--color-text-muted)",
    },
    ".cm-find-icon": { display: "inline-flex", marginRight: "6px", color: "var(--color-text-faint)" },
    ".cm-find-field": { position: "relative", display: "flex", alignItems: "center", marginRight: "4px" },
    ".cm-find-field input": {
      width: "200px",
      padding: "5px 64px 5px 8px",
      border: "1px solid var(--color-field-border)",
      borderRadius: "var(--radius)",
      backgroundColor: "var(--color-field)",
      color: "var(--color-text)",
      fontFamily: "var(--font-code)",
      fontSize: "calc(12px * var(--text-scale))",
      outline: "none",
    },
    ".cm-find-field input:focus": { borderColor: "var(--color-accent)" },
    ".cm-find-field input::placeholder": { color: "var(--color-text-faint)" },
    ".cm-find-count": {
      position: "absolute",
      right: "8px",
      color: "var(--color-text-faint)",
      fontSize: "calc(11px * var(--text-scale))",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    },
    ".cm-find-button": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "26px",
      height: "26px",
      padding: "0",
      border: "none",
      borderRadius: "var(--radius)",
      backgroundColor: "transparent",
      color: "var(--color-text-muted)",
      cursor: "pointer",
    },
    ".cm-find-button:hover": { backgroundColor: "var(--color-selected)", color: "var(--color-text)" },
    ".cm-find-button:focus-visible": { outline: "2px solid var(--color-accent)", outlineOffset: "-2px" },
    // Find matches as in VS Code: an orange tint on each, a stronger colour on the current one.
    ".cm-searchMatch": { backgroundColor: "var(--editor-find-match)", borderRadius: "2px" },
    ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--editor-find-current)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--color-text-muted)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--editor-selection) !important",
    },
    ".cm-matchingBracket": {
      backgroundColor: "var(--editor-bracket)",
      outline: "1px solid var(--editor-bracket-border)",
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

/** Code colours as in VS Code (Default Light+ / Dark+); the tokens are in theme.css. */
export const codeHighlightStyle = HighlightStyle.define([
  // JSON
  { tag: tags.propertyName, color: "var(--syntax-key)" },
  { tag: tags.string, color: "var(--syntax-string)" },
  { tag: tags.number, color: "var(--syntax-number)" },
  { tag: [tags.bool, tags.null, tags.atom], color: "var(--syntax-literal)" },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: "var(--syntax-punctuation)" },
  // XML / HTML
  { tag: tags.tagName, color: "var(--syntax-tag)" },
  { tag: tags.angleBracket, color: "var(--color-text-faint)" },
  { tag: tags.attributeName, color: "var(--syntax-attribute)" },
  { tag: tags.attributeValue, color: "var(--syntax-string)" },
  { tag: [tags.processingInstruction, tags.documentMeta], color: "var(--color-text-faint)" },
  // Scripts (JavaScript)
  { tag: [tags.controlKeyword, tags.moduleKeyword, tags.operatorKeyword], color: "var(--syntax-keyword)" },
  { tag: [tags.keyword, tags.definitionKeyword, tags.modifier, tags.self], color: "var(--syntax-literal)" },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: "var(--syntax-function)",
  },
  { tag: [tags.typeName, tags.className, tags.namespace], color: "var(--syntax-type)" },
  { tag: [tags.variableName, tags.definition(tags.variableName)], color: "var(--syntax-variable)" },
  { tag: tags.regexp, color: "var(--syntax-regexp)" },
  { tag: tags.comment, color: "var(--syntax-comment)" },
  { tag: tags.invalid, color: "var(--color-danger)" },
]);
