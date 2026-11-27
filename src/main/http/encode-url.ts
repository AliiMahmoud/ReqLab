/**
 * What may stay as typed in a URL's path and query: unreserved and structural characters, and "%"
 * when it starts an escape already there (%20). Everything else is percent-encoded.
 */
const NEEDS_ENCODING = /%(?![0-9A-Fa-f]{2})|[^A-Za-z0-9\-._~!$&'()*+,;=:@/?#%[\]]/gu;

/** "scheme://authority" and the rest (path, query, fragment). */
const SPLIT_AUTHORITY = /^([a-z][a-z0-9+.-]*:\/\/[^/?#]*)(.*)$/is;

/**
 * The URL as it goes on the wire, encoded the way servers expect, while the editor keeps showing
 * it as typed: spaces, quotes, braces, "|", non-ASCII … in the path and query become %XX. Its
 * structure (/ ? & = # :) is kept, and an escape already there (%20) is left alone, so a value is
 * never encoded twice. The host is not touched (the URL parser handles international names).
 */
export function encodeUrlForSending(url: string): string {
  const parts = SPLIT_AUTHORITY.exec(url);
  if (parts === null) return url;
  const [, origin = "", rest = ""] = parts;
  return origin + rest.replace(NEEDS_ENCODING, (character) => encodeURIComponent(character));
}
