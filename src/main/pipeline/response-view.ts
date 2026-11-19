import type { ResponseView } from "@shared/models/http-exchange";
import type { ScriptReport } from "@shared/models/script-report";
import { MAX_DISPLAYED_BODY_BYTES } from "../http/http-limits";
import { findHeader, type FinalResponse } from "../http/http-types";
import { toImageView } from "./response-image";

const TEXT_TYPES =
  /^(text\/|application\/([\w.+-]*\+)?(json|xml|javascript|x-www-form-urlencoded|graphql)|image\/svg\+xml)/i;

/** What the UI receives: text cut at the display limit, binary bodies described rather than sent. */
export function toResponseView(
  response: FinalResponse,
  { mask, warnings, scripts }: { mask: (text: string) => string; warnings: string[]; scripts?: ScriptReport },
): ResponseView {
  const contentType = findHeader(response.headers, "content-type") ?? "";
  const isBinary = !looksLikeText(contentType, response.body);
  const shown = response.body.subarray(0, MAX_DISPLAYED_BODY_BYTES);
  const image = toImageView(contentType, response.body);
  return {
    status: response.status,
    statusText: response.statusText,
    httpVersion: response.httpVersion,
    url: mask(response.url.href),
    redirectCount: response.redirectCount,
    headers: response.headers.map(([key, value]) => ({ key, value })),
    body: {
      text: isBinary ? "" : shown.toString("utf8"),
      size: response.body.length,
      isTruncated: !isBinary && response.body.length > shown.length,
      isBinary,
      contentType,
      ...(image === undefined ? {} : { image }),
    },
    timings: response.timings,
    warnings,
    ...(scripts === undefined ? {} : { scripts }),
  };
}

function looksLikeText(contentType: string, body: Buffer): boolean {
  if (TEXT_TYPES.test(contentType.trim())) return true;
  if (contentType.trim() !== "") return false;
  return !body.subarray(0, 1024).includes(0);
}
