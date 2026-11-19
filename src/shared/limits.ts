/** Limits shared by the UI and main. Zod-free so the UI bundle stays small. */
export const MIN_MASTER_PASSWORD_LENGTH = 12;
export const MAX_WORKSPACE_NAME_LENGTH = 100;

export const MAX_NAME_LENGTH = 200;
export const MAX_URL_LENGTH = 65_536;
export const MAX_KEY_VALUE_ROWS = 500;
export const MAX_KEY_LENGTH = 1_024;
export const MAX_VALUE_LENGTH = 65_536;
export const MAX_BODY_TEXT_LENGTH = 10_000_000;
export const MAX_VARIABLES_PER_SCOPE = 1_000;
export const MAX_HISTORY_ENTRIES = 500;
export const MAX_OPEN_TABS = 50;
/** A tab's last response is kept across restarts only up to this much body text. */
export const MAX_PERSISTED_RESPONSE_TEXT = 65_536;
export const MAX_PASSPHRASE_LENGTH = 1_024;

/** Request, folder and collection descriptions (Postman's documentation text). */
export const MAX_DESCRIPTION_LENGTH = 65_536;
