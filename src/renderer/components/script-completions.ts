import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { CompletionConfig } from "./code-area";
import { renderRequestOption, requestOptionClass, type RequestCompletion } from "./request-option";
import { savedRequests } from "./saved-requests";
import { EXPECT_WORDS, SCRIPT_API } from "./script-api-entries";

/**
 * Suggestions in the script editors: the pm API by path ("pm.env…" → environment), the words of
 * pm.expect(…), and inside pm.execution.runRequest("…") the workspace's requests (inserting the ID).
 */
export function scriptCompletions(context: CompletionContext): CompletionResult | null {
  return requestIdCompletions(context) ?? expectCompletions(context) ?? apiCompletions(context);
}

function apiCompletions(context: CompletionContext): CompletionResult | null {
  const typed = context.matchBefore(/[\w$]+(?:\.[\w$]*)*$/);
  if (typed === null || (typed.text === "" && !context.explicit)) return null;
  const dot = typed.text.lastIndexOf(".");
  const parent = dot === -1 ? "" : typed.text.slice(0, dot);
  const options: Completion[] = SCRIPT_API.filter(([path]) => parentOf(path) === parent).map(
    ([path, kind, detail]) => ({
      label: path.slice(parent === "" ? 0 : parent.length + 1),
      type: kind === "namespace" ? "namespace" : kind,
      detail,
    }),
  );
  if (options.length === 0) return null;
  return { from: typed.from + dot + 1, options, validFor: /^[\w$]*$/ };
}

function expectCompletions(context: CompletionContext): CompletionResult | null {
  const typed = context.matchBefore(/expect\([^()]*\)(?:\.[\w$]+(?:\([^()]*\))?)*\.[\w$]*$/);
  if (typed === null) return null;
  const from = typed.from + typed.text.lastIndexOf(".") + 1;
  return { from, options: EXPECT_WORDS.map((label) => ({ label, type: "property" })), validFor: /^[\w$]*$/ };
}

/**
 * After pm.execution.runRequest( (with or without a quote): every saved request by name, searchable;
 * picking one inserts its ID, quoted if needed.
 */
function requestIdCompletions(context: CompletionContext): CompletionResult | null {
  const typed = context.matchBefore(/runRequest\(\s*["']?[^"'()]*$/);
  if (typed === null) return null;
  const quote = Math.max(typed.text.lastIndexOf('"'), typed.text.lastIndexOf("'"));
  const hasQuote = quote !== -1;
  const from = hasQuote ? typed.from + quote + 1 : typed.from + typed.text.indexOf("(") + 1;
  const options: RequestCompletion[] = savedRequests().map((request) => ({
    label: request.name,
    apply: hasQuote ? request.id : `"${request.id}"`,
    type: "request",
    request,
  }));
  return { from, options };
}

function parentOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(0, dot);
}

/** What the script editors pass to their code editor: the suggestions and how request rows look. */
export const scriptCompletionConfig: CompletionConfig = {
  source: scriptCompletions,
  optionClass: requestOptionClass,
  addToOptions: [{ render: renderRequestOption, position: 60 }],
};
