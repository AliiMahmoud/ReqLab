/** Hostile-file defences: every import is bounded before any of it is trusted. */
export const MAX_IMPORT_FILES = 50;
export const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_JSON_DEPTH = 128;
export const MAX_IMPORTED_ITEMS = 20_000;
export const MAX_TREE_DEPTH = 32;
export const MAX_WARNINGS = 200;
/** A chosen file must be imported within this time, or chosen again. */
export const IMPORT_TOKEN_LIFETIME_MS = 10 * 60_000;
