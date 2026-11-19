import type { RequestBody } from "@shared/models/request";
import { formatMarkup } from "../components/format-markup";
import { prettyPrintJson } from "../components/json-format";
import { languageForContentType } from "../components/raw-content-types";
import { showNotice } from "./notice-store";
import { getActiveTab, updateDraft } from "./tab-store";

/**
 * Beautify (button and Cmd/Ctrl+B): re-indents the active request's JSON body, a raw JSON / XML /
 * HTML body, or the JSON variables of a GraphQL body.
 */
export function beautifyActiveBody(): void {
  const tab = getActiveTab();
  if (tab === undefined) return;
  const { body } = tab.draft;
  if (body.type === "json") {
    const pretty = prettyPrintJson(body.text);
    if (pretty === undefined) showNotice("The body is not valid JSON yet.");
    else updateDraft(tab.id, { body: { ...body, text: pretty } });
    return;
  }
  if (body.type === "graphql" && body.variables.trim() !== "") {
    const pretty = prettyPrintJson(body.variables);
    if (pretty === undefined) showNotice("The GraphQL variables are not valid JSON yet.");
    else updateDraft(tab.id, { body: { ...body, variables: pretty } });
    return;
  }
  if (body.type === "raw") {
    beautifyRawBody(tab.id, body);
    return;
  }
  showNotice("Beautify works on JSON, XML and HTML bodies.");
}

/** Raw bodies beautify by their Content-Type: JSON, or XML / HTML. */
function beautifyRawBody(tabId: string, body: Extract<RequestBody, { type: "raw" }>): void {
  const language = languageForContentType(body.contentType);
  if (language === "text") {
    showNotice("Beautify works on JSON, XML and HTML. Pick one of those content types.");
    return;
  }
  const pretty = language === "json" ? prettyPrintJson(body.text) : formatMarkup(body.text);
  if (pretty === undefined)
    showNotice(`The body is not valid ${language === "json" ? "JSON" : "XML / HTML"} yet.`);
  else updateDraft(tabId, { body: { ...body, text: pretty } });
}
