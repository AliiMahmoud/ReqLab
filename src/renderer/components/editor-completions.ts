import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionSource,
} from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";

/** Suggestions while typing: where they come from and, optionally, custom rows. */
export interface CompletionConfig {
  source: CompletionSource;
  optionClass?: (completion: Completion) => string;
  addToOptions?: { render: (completion: Completion) => Node | null; position: number }[];
}

/** Suggestions as you type (Ctrl+Space too), Enter / Tab to accept. */
export function completionExtension(config: CompletionConfig | undefined): Extension {
  if (config === undefined) return [];
  const { source, optionClass, addToOptions } = config;
  return [
    autocompletion({
      override: [source],
      icons: false,
      ...(optionClass ? { optionClass } : {}),
      addToOptions: addToOptions ?? [],
    }),
    keymap.of(completionKeymap),
  ];
}
