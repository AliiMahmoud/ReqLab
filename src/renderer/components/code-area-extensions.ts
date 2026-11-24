import { toggleLineComment } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { EditorState, type Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { appSettings } from "../stores/app-settings-store";
import { autoClose } from "./auto-close";

/** The code editor's swappable parts: its language, line comments and auto-closing. */

export type CodeLanguage = "json" | "xml" | "javascript" | "text";

/**
 * Cmd/Ctrl+/ comments or uncomments the current or selected lines with `marker`.
 * (The default keymap binds Mod-/; Ctrl-/ is added so it also works with Ctrl on macOS.)
 */
export function commentExtension(marker: string | undefined): Extension {
  if (marker === undefined) return [];
  return [
    EditorState.languageData.of(() => [{ commentTokens: { line: marker } }]),
    keymap.of([{ key: "Ctrl-/", run: toggleLineComment }]),
  ];
}

export function languageExtension(language: CodeLanguage): Extension {
  if (language === "json") return json();
  if (language === "javascript") return javascript();
  return language === "xml" ? xml() : [];
}

/** Settings › Editor: auto-close brackets / quotes. */
export function autoCloseFromSettings(): Extension {
  const { closeBrackets, closeQuotes } = appSettings.get();
  return autoClose({ brackets: closeBrackets, quotes: closeQuotes });
}
