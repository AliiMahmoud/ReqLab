export const MAX_REDIRECTS = 10;
/** Kept in memory for now; the plan's encrypted temp file for big bodies is a later step. */
export const MAX_RESPONSE_BYTES = 50 * 1024 * 1024;
/** A body may grow at most 100× when decompressed (zip-bomb guard), above a 1 MB allowance. */
export const MAX_DECOMPRESSION_RATIO = 100;
export const DECOMPRESSION_ALLOWANCE_BYTES = 1024 * 1024;
/** How much of a body the UI receives: enough for a big JSON to arrive whole (pretty, foldable). */
export const MAX_DISPLAYED_BODY_BYTES = 20 * 1024 * 1024;
/** Images travel as base64 (a third bigger), so they get a smaller limit. */
export const MAX_DISPLAYED_IMAGE_BYTES = 10 * 1024 * 1024;
