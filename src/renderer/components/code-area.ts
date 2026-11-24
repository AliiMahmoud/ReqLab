import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { completionExtension, type CompletionConfig } from "./editor-completions";

export type { CompletionConfig } from "./editor-completions";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  unfoldAll,
} from "@codemirror/language";
import { search, searchKeymap } from "@codemirror/search";
import { createFindPanel } from "./find-panel";
import { Compartment, EditorState, type Extension, type StateEffect } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from "@codemirror/view";
import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { knownVariableNames } from "../stores/environment-store";
import { codeEditorTheme, codeHighlightStyle } from "./code-editor-theme";
import { jsonChecker } from "./json-check";
import { foldEverythingInside } from "./fold-all";
import { appSettings } from "../stores/app-settings-store";
import { refreshVariableColours, variableHighlighter } from "./variable-decorations";
import { editorStateFor, keepEditorState } from "./editor-history";
import { autoCloseFromSettings, commentExtension, languageExtension } from "./code-area-extensions";

export type { CodeLanguage } from "./code-area-extensions";
import type { CodeLanguage } from "./code-area-extensions";

/** Only finding: Cmd/Ctrl+F, F3 / Cmd/Ctrl+G (and with Shift), Escape. Not go-to-line or multi-select. */
const FIND_KEYS = new Set(["Mod-f", "F3", "Mod-g", "Escape"]);

/**
 * Cmd/Ctrl+Enter sends the request in ReqLab, so CodeMirror must not take it for "insert line".
 * Cmd/Ctrl+F finds in the body (Enter / Shift+Enter or F3 for the next / previous match, Escape closes).
 */
const editorKeymap = [
  ...defaultKeymap.filter((binding) => binding.key !== "Mod-Enter"),
  ...historyKeymap,
  ...foldKeymap,
  ...searchKeymap.filter((binding) => FIND_KEYS.has(binding.key ?? "")),
  indentWithTab,
];

/** What every editor has: gutters, history, bracket matching, colours and keys. */
const BASE_EXTENSIONS: Extension[] = [
  lineNumbers(),
  foldGutter({ openText: "▾", closedText: "▸" }),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  drawSelection(),
  history(),
  // A small find bar above the text (find-panel.ts).
  search({ top: true, createPanel: createFindPanel }),
  bracketMatching(),
  indentOnInput(),
  EditorState.tabSize.of(2),
  syntaxHighlighting(codeHighlightStyle),
  codeEditorTheme,
  keymap.of(editorKeymap),
];

/**
 * The code editor (CodeMirror 6): line numbers, syntax colours, bracket matching, undo history and,
 * for JSON / XML, folding. Read-only for the response, where Cmd/Ctrl+A selects just the body. Keeps the simple API the editors use: value / onChange, label, placeholder.
 */
export class CodeArea extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 160px;
      overflow: hidden;
    }
    .host {
      flex: 1;
      min-height: 0;
    }
  `;
  static override properties = {
    value: { attribute: false },
    label: { attribute: false },
    placeholder: { attribute: false },
    language: { attribute: false },
    wrap: { attribute: false },
    readOnly: { attribute: false },
    lineComment: { attribute: false },
    completions: { attribute: false },
    extras: { attribute: false },
    historyKey: { attribute: false },
    onChange: { attribute: false },
  };

  declare value: string;
  declare label: string;
  declare placeholder: string;
  declare language: CodeLanguage;
  declare wrap: boolean;
  /** Viewing only (the response): selectable and copyable, but not editable. */
  declare readOnly: boolean;
  /** The line-comment marker Cmd/Ctrl+/ toggles (e.g. "//" in Bulk Edit); none when undefined. */
  declare lineComment: string | undefined;
  /** Suggestions while typing (e.g. the pm.* API in scripts); none when undefined. */
  declare completions: CompletionConfig | undefined;
  /** More editor features for one use (e.g. request labels in scripts). */
  declare extras: Extension;
  /** Keeps undo history when the editor is rebuilt or shows another tab (e.g. "tab-id:body"). */
  declare historyKey: string | undefined;
  declare onChange: (value: string) => void;
  #view: EditorView | undefined;
  #stopWatchingNames: (() => void) | undefined;
  readonly #languageSlot = new Compartment();
  readonly #wrapSlot = new Compartment();
  readonly #labelSlot = new Compartment();
  readonly #readOnlySlot = new Compartment();
  readonly #commentSlot = new Compartment();
  readonly #checkSlot = new Compartment();
  readonly #autoCloseSlot = new Compartment();
  readonly #completionSlot = new Compartment();
  readonly #extrasSlot = new Compartment();
  #stopWatchingSettings: (() => void) | undefined;

  constructor() {
    super();
    this.value = "";
    this.label = "Code";
    this.placeholder = "";
    this.language = "text";
    this.wrap = false;
    this.readOnly = false;
    this.lineComment = undefined;
    this.completions = undefined;
    this.extras = [];
    this.historyKey = undefined;
    this.onChange = () => undefined;
  }

  foldAll(): void {
    if (this.#view !== undefined) foldEverythingInside(this.#view);
  }

  unfoldAll(): void {
    if (this.#view !== undefined) unfoldAll(this.#view);
  }

  override render(): TemplateResult {
    return html`<div class="host"></div>`;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && this.#view === undefined) this.createView();
    this.#stopWatchingSettings = appSettings.subscribe(() => {
      this.#view?.dispatch({ effects: this.#autoCloseSlot.reconfigure(autoCloseFromSettings()) });
    });
    this.#stopWatchingNames = knownVariableNames.subscribe(() => {
      this.#view?.dispatch({ effects: refreshVariableColours.of(null) });
    });
  }

  override disconnectedCallback(): void {
    if (this.#view !== undefined && this.historyKey !== undefined)
      keepEditorState(this.historyKey, this.#view.state);
    this.#view?.destroy();
    this.#view = undefined;
    this.#stopWatchingNames?.();
    this.#stopWatchingSettings?.();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.createView();
  }

  protected override updated(changed: PropertyValues<this>): void {
    const view = this.#view;
    if (view === undefined) return;
    // The same editor now shows another tab: keep the old tab's history, bring back this one's.
    if (changed.has("historyKey")) {
      const previous = changed.get("historyKey");
      if (previous !== undefined) keepEditorState(previous, view.state);
      view.setState(editorStateFor(this.historyKey, this.value, this.extensions()));
      return;
    }
    if (changed.has("value") && this.value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.value } });
    }
    const effects = this.reconfigurations(changed);
    if (effects.length > 0) view.dispatch({ effects });
  }

  /** Language, wrapping and labels can change without rebuilding the editor. */
  private reconfigurations(changed: PropertyValues<this>): StateEffect<unknown>[] {
    const slots: [boolean, () => StateEffect<unknown>][] = [
      [changed.has("language"), () => this.#languageSlot.reconfigure(languageExtension(this.language))],
      [changed.has("wrap"), () => this.#wrapSlot.reconfigure(this.wrap ? EditorView.lineWrapping : [])],
      [changed.has("lineComment"), () => this.#commentSlot.reconfigure(commentExtension(this.lineComment))],
      [
        changed.has("completions"),
        () => this.#completionSlot.reconfigure(completionExtension(this.completions)),
      ],
      [changed.has("extras"), () => this.#extrasSlot.reconfigure(this.extras)],
      [changed.has("readOnly"), () => this.#readOnlySlot.reconfigure(EditorState.readOnly.of(this.readOnly))],
      [
        changed.has("language") || changed.has("readOnly"),
        () => this.#checkSlot.reconfigure(this.checkExtension()),
      ],
      [
        changed.has("label") || changed.has("placeholder"),
        () => this.#labelSlot.reconfigure(this.labelExtension()),
      ],
    ];
    return slots.filter(([isChanged]) => isChanged).map(([, effect]) => effect());
  }

  private createView(): void {
    const parent = this.renderRoot.querySelector(".host");
    if (parent === null) return;
    this.#view = new EditorView({
      parent,
      root: this.renderRoot as ShadowRoot,
      state: editorStateFor(this.historyKey, this.value, this.extensions()),
    });
  }

  private extensions(): Extension[] {
    return [
      ...BASE_EXTENSIONS,
      this.#languageSlot.of(languageExtension(this.language)),
      this.#wrapSlot.of(this.wrap ? EditorView.lineWrapping : []),
      this.#labelSlot.of(this.labelExtension()),
      this.#readOnlySlot.of(EditorState.readOnly.of(this.readOnly)),
      this.#commentSlot.of(commentExtension(this.lineComment)),
      this.#checkSlot.of(this.checkExtension()),
      this.#autoCloseSlot.of(autoCloseFromSettings()),
      this.#completionSlot.of(completionExtension(this.completions)),
      this.#extrasSlot.of(this.extras),
      variableHighlighter((name) => knownVariableNames.get().has(name)),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const text = update.state.doc.toString();
        if (text !== this.value) this.onChange(text);
      }),
    ];
  }

  /** Editable JSON is checked as you type; the response and other languages are not. */
  private checkExtension(): Extension {
    if (this.language !== "json" || this.readOnly) return [];
    return jsonChecker();
  }

  private labelExtension(): Extension {
    return [EditorView.contentAttributes.of({ "aria-label": this.label }), placeholder(this.placeholder)];
  }
}

customElements.define("code-area", CodeArea);

declare global {
  interface HTMLElementTagNameMap {
    "code-area": CodeArea;
  }
}
