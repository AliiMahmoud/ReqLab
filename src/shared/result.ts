/** What every IPC call returns: either a value or a safe, displayable error. Never a stack trace. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: ErrorView };

export interface ErrorView {
  code: ErrorCode;
  message: string;
}

export const ErrorCodes = [
  "invalid-input",
  "untrusted-sender",
  "workspace-not-found",
  "workspace-locked",
  "master-password-required",
  "wrong-master-password",
  "too-many-attempts",
  "keychain-unavailable",
  "database-corrupted",
  "confirmation-mismatch",
  "confirmation-required",
  "item-not-found",
  "environment-not-found",
  "invalid-move",
  "request-failed",
  "request-cancelled",
  "import-failed",
  "wrong-passphrase",
  "internal-error",
] as const;

export type ErrorCode = (typeof ErrorCodes)[number];
