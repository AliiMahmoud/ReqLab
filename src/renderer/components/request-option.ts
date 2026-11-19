import type { Completion } from "@codemirror/autocomplete";
import { methodColor } from "./method-colors";
import type { SavedRequest } from "./saved-requests";

/** A runRequest suggestion: a normal completion that also carries its request. */
export interface RequestCompletion extends Completion {
  request: SavedRequest;
}

function isRequestCompletion(completion: Completion): completion is RequestCompletion {
  return "request" in completion;
}

/** Request rows get their own look (their plain label is hidden). */
export function requestOptionClass(completion: Completion): string {
  return isRequestCompletion(completion) ? "cm-request-option" : "";
}

/**
 * A request row in the suggestions: the method in its colour and the name, and under it in small
 * text the full path (collection / folder / … / request).
 */
export function renderRequestOption(completion: Completion): Node | null {
  if (!isRequestCompletion(completion)) return null;
  const { method, name, path } = completion.request;
  const row = element("span", "cm-request-row");
  const title = element("span", "cm-request-title");
  const badge = element("span", "cm-request-method", method.toUpperCase());
  badge.style.color = methodColor(method);
  title.append(badge, element("span", "cm-request-name", name));
  row.append(title, element("span", "cm-request-path", path));
  return row;
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
