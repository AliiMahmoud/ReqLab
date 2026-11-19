import type { ErrorCode } from "@shared/result";

/** Base class for every expected failure. Its message is safe to show to the user. */
export class ReqLabError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class WorkspaceNotFound extends ReqLabError {
  constructor() {
    super("workspace-not-found", "This workspace no longer exists.");
  }
}

export class WorkspaceLocked extends ReqLabError {
  constructor() {
    super("workspace-locked", "This workspace is locked.");
  }
}

export class MasterPasswordRequired extends ReqLabError {
  constructor(reason: string) {
    super("master-password-required", reason);
  }
}

export class WrongMasterPassword extends ReqLabError {
  constructor() {
    super("wrong-master-password", "The master password is not correct.");
  }
}

export class TooManyAttempts extends ReqLabError {
  constructor(retryAfterSeconds: number) {
    super("too-many-attempts", `Too many wrong attempts. Try again in ${String(retryAfterSeconds)} seconds.`);
  }
}

export class KeychainUnavailable extends ReqLabError {
  constructor() {
    super("keychain-unavailable", "The operating system's secure storage is not available.");
  }
}

export class DatabaseCorrupted extends ReqLabError {
  constructor() {
    super("database-corrupted", "The workspace file failed its integrity check.");
  }
}

export class UntrustedSender extends ReqLabError {
  constructor() {
    super("untrusted-sender", "Request rejected.");
  }
}

export class InvalidInput extends ReqLabError {
  constructor(details: string) {
    super("invalid-input", details);
  }
}

export class ConfirmationMismatch extends ReqLabError {
  constructor() {
    super("confirmation-mismatch", "The typed name does not match the workspace name.");
  }
}

export class ItemNotFound extends ReqLabError {
  constructor() {
    super("item-not-found", "This item no longer exists.");
  }
}

export class EnvironmentNotFound extends ReqLabError {
  constructor() {
    super("environment-not-found", "This environment no longer exists.");
  }
}

export class InvalidMove extends ReqLabError {
  constructor() {
    super("invalid-move", "An item cannot be moved there.");
  }
}

export class RequestFailed extends ReqLabError {
  constructor(message: string) {
    super("request-failed", message);
  }
}

export class RequestCancelled extends ReqLabError {
  constructor() {
    super("request-cancelled", "The request was cancelled.");
  }
}

export class ImportFailed extends ReqLabError {
  constructor(message: string) {
    super("import-failed", message);
  }
}

export class WrongPassphrase extends ReqLabError {
  constructor() {
    super("wrong-passphrase", "The passphrase is not correct, or the file was changed.");
  }
}

export class ProtectedEnvironmentConfirmationRequired extends ReqLabError {
  constructor(environmentName: string) {
    super(
      "confirmation-required",
      `"${environmentName}" is a protected environment. Confirm to send this request.`,
    );
  }
}
