/** A {{variable}}: kept exactly as written, so it still resolves when the request is sent. */
const VARIABLE = /(\{\{[^{}]*\}\})/;

/**
 * What must be encoded in a query key or value: everything but unreserved characters and the
 * readable ones a query may hold as they are (/ : @ , ; …). "&", "=", "#", "+", "%" and spaces
 * are encoded, since they would change the query's meaning.
 */
const NEEDS_ENCODING = /[^A-Za-z0-9\-._~!$'()*,;:@/?]/gu;

/** "hello world & more" → "hello%20world%20%26%20more"; {{variables}} stay as written. */
export function encodeQueryPart(text: string): string {
  return text
    .split(VARIABLE)
    .map((part) =>
      VARIABLE.test(part) ? part : part.replace(NEEDS_ENCODING, (character) => encodeURIComponent(character)),
    )
    .join("");
}

/** "hello%20world" → "hello world"; an escape that is not valid ("50%") is left as it is. */
export function decodeQueryPart(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (escapes) => {
      try {
        return decodeURIComponent(escapes);
      } catch {
        return escapes;
      }
    });
  }
}
