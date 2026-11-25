import type { ResponseView } from "@shared/models/http-exchange";
import { api } from "../../api";
import { callApi, showNotice } from "../../stores/notice-store";
import type { RequestTab } from "../../stores/request-tab";

interface Notice {
  text: string;
  isError: boolean;
}

const done = (text: string): Notice => ({ text, isError: false });
const problem = (text: string): Notice => ({ text, isError: true });
const NOT_TEXT = problem("This response is not text: use Download to save it.");
/** The save dialog was cancelled: nothing to say, and no fallback either. */
const CANCELLED: Notice = { text: "", isError: false };

/**
 * The response's Copy and Download. The body exactly as received when main still keeps it (the
 * last few responses); otherwise, e.g. for a response restored at launch, what the view shows
 * (secret values masked, text cut at the display limit).
 */
export async function copyResponse(tab: RequestTab, response: ResponseView): Promise<void> {
  show((await copyKept(tab)) ?? (await copyShown(response)));
}

export async function saveResponse(tab: RequestTab, response: ResponseView): Promise<void> {
  show((await saveKept(tab)) ?? (await saveShown(tab.name, response)));
}

function show(notice: Notice | undefined): void {
  if (notice !== undefined && notice !== CANCELLED) showNotice(notice.text, notice.isError);
}

/** Undefined when main no longer keeps this response: the view's content is used instead. */
async function copyKept(tab: RequestTab): Promise<Notice | undefined> {
  if (tab.lastRequestId === undefined) return undefined;
  const copied = await callApi(api.copyResponseBody({ requestId: tab.lastRequestId }));
  if (copied === undefined || copied.result === "gone") return undefined;
  if (copied.result === "binary") return NOT_TEXT;
  return copied.result === "copied-secret"
    ? done("Response copied. It holds a secret value: the clipboard clears in 30 seconds.")
    : done("Response copied.");
}

async function saveKept(tab: RequestTab): Promise<Notice | undefined> {
  if (tab.lastRequestId === undefined) return undefined;
  const saved = await callApi(api.saveResponseBody({ requestId: tab.lastRequestId, requestName: tab.name }));
  if (saved === undefined || saved.result === "gone") return undefined;
  if (saved.result === "cancelled") return CANCELLED;
  return done(saved.containsSecret ? "Response saved. Note: it holds a secret value." : "Response saved.");
}

async function copyShown({ body }: ResponseView): Promise<Notice | undefined> {
  if (body.isBinary) return NOT_TEXT;
  if ((await callApi(api.copyShownBody({ text: body.text }))) === undefined) return undefined;
  return done(body.isTruncated ? "Copied the part of the response that is shown." : "Response copied.");
}

async function saveShown(requestName: string, { body }: ResponseView): Promise<Notice | undefined> {
  if (body.isBinary && body.image === undefined) {
    return problem("This response is no longer kept: send the request again to save it.");
  }
  const content = body.image === undefined ? { text: body.text } : { base64: body.image.base64 };
  const saved = await callApi(api.saveShownBody({ requestName, contentType: body.contentType, ...content }));
  if (saved?.result !== "saved") return undefined;
  return done(body.isTruncated ? "Saved the part of the response that is shown." : "Response saved.");
}
