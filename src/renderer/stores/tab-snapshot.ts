import type { PersistedTab } from "@shared/models/open-tabs";
import type { ResponseView } from "@shared/models/http-exchange";
import { MAX_PERSISTED_RESPONSE_TEXT } from "@shared/limits";
import type { RequestTab } from "./request-tab";

/** A tab as it is saved: everything except what only makes sense now (ids, a request in flight). */
export function toPersistedTab(tab: RequestTab): PersistedTab {
  return {
    itemId: tab.itemId,
    name: tab.name,
    draft: tab.draft,
    editorSection: tab.editorSection,
    responseSection: tab.responseSection,
    bodyView: tab.bodyView,
    response: keepableResponse(tab.response),
    error: tab.error?.slice(0, 2_000) ?? null,
  };
}

/**
 * Rebuilds a tab. `savedJson` is the request as stored now, so edits made before closing
 * still show as unsaved. A draft has no saved copy ("").
 */
export function fromPersistedTab(persisted: PersistedTab, savedJson: string): RequestTab {
  return {
    id: crypto.randomUUID(),
    itemId: savedJson === "" ? null : persisted.itemId,
    name: persisted.name,
    draft: persisted.draft,
    savedJson,
    response: persisted.response ?? undefined,
    error: persisted.error ?? undefined,
    sendingRequestId: undefined,
    editorSection: persisted.editorSection,
    responseSection: persisted.responseSection,
    bodyView: persisted.bodyView,
  };
}

/** About 750 KB of picture: bigger images are not kept in the saved tabs (the rest of the response is). */
const MAX_PERSISTED_IMAGE_BASE64 = 1_000_000;

function keepableResponse(response: ResponseView | undefined): ResponseView | null {
  if (response === undefined || response.body.text.length > MAX_PERSISTED_RESPONSE_TEXT) return null;
  const { image, ...body } = response.body;
  if (image === undefined || image.base64.length <= MAX_PERSISTED_IMAGE_BASE64) return response;
  return { ...response, body };
}
