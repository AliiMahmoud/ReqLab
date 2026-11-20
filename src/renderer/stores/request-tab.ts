import type { ResponseView } from "@shared/models/http-exchange";
import type { RequestDefinition } from "@shared/models/request";

export type EditorSection = "params" | "headers" | "body" | "auth" | "scripts";
export type ResponseSection = "body" | "headers" | "timing" | "tests";
export type BodyView = "pretty" | "raw" | "preview";

export type ContainerSection = "auth" | "variables" | "scripts";

/** A collection's or folder's settings, open in a tab of its own (like Postman). */
export interface ContainerTabInfo {
  id: string;
  isCollection: boolean;
  section: ContainerSection;
}

/** One open request. A tab without an itemId is an unsaved draft. */
export interface RequestTab {
  /** Set for a collection / folder settings tab (its request fields are unused). */
  container?: ContainerTabInfo;
  id: string;
  itemId: string | null;
  name: string;
  draft: RequestDefinition;
  /** JSON of the last saved definition; differs from the draft when there are unsaved edits. */
  savedJson: string;
  response: ResponseView | undefined;
  error: string | undefined;
  /** Set while a request is in flight, so it can be cancelled. */
  sendingRequestId: string | undefined;
  /** The last finished send, whose network log the Log button shows. */
  lastRequestId?: string | undefined;
  editorSection: EditorSection;
  responseSection: ResponseSection;
  bodyView: BodyView;
}

export function createTab(fields: {
  itemId: string | null;
  name: string;
  definition: RequestDefinition;
}): RequestTab {
  return {
    id: crypto.randomUUID(),
    itemId: fields.itemId,
    name: fields.name,
    draft: fields.definition,
    savedJson: fields.itemId === null ? "" : JSON.stringify(fields.definition),
    response: undefined,
    error: undefined,
    sendingRequestId: undefined,
    editorSection: fields.definition.body.type === "none" ? "params" : "body",
    responseSection: "body",
    bodyView: "pretty",
  };
}

/** A settings tab saves itself as you go, so it never has unsaved changes. */
export function hasUnsavedChanges(tab: RequestTab): boolean {
  if (tab.container !== undefined) return false;
  return tab.itemId === null || JSON.stringify(tab.draft) !== tab.savedJson;
}
