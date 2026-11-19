import { randomBytes } from "node:crypto";
import { MasterPasswordRequired, WorkspaceNotFound, WrongMasterPassword } from "../../errors";
import { AttemptLimiter } from "./attempt-limiter";
import { openWithKey, sealWithKey } from "./envelope";
import type { KeyRecord, KeyStoreFile } from "./key-store-file";
import { createKdfParams, deriveKeyFromPassword, type KdfParams } from "./password-key-derivation";
import type { OsKeychain } from "./os-keychain";

const WORKSPACE_KEY_BYTES = 32;

interface SealedKey {
  workspaceId: string;
  sealed: Buffer;
  kdf: KdfParams;
  masterPassword: string | undefined;
}

/**
 * Creates and unlocks workspace keys.
 *   workspace key  --(master password, AES-256-GCM, optional)-->  --(OS keychain)-->  keys.json
 * Callers own the returned key buffer and must zero it (key.fill(0)) once the database is open.
 */
export class KeyManager {
  readonly #attempts = new AttemptLimiter();

  constructor(
    private readonly keychain: OsKeychain,
    private readonly store: KeyStoreFile,
  ) {}

  keyProtectionName(): string {
    return this.keychain.backendName();
  }

  isMasterPasswordRequired(): Promise<boolean> {
    return this.keychain.isWeak();
  }

  hasMasterPassword(workspaceId: string): boolean {
    return this.store.get(workspaceId)?.passwordKdf !== undefined;
  }

  async createWorkspaceKey(workspaceId: string, masterPassword?: string): Promise<Buffer> {
    if (masterPassword === undefined && (await this.isMasterPasswordRequired())) {
      throw new MasterPasswordRequired(
        "This system has no secure key storage, so a master password is required.",
      );
    }
    const workspaceKey = randomBytes(WORKSPACE_KEY_BYTES);
    this.store.put(workspaceId, await this.wrapKey(workspaceId, workspaceKey, masterPassword));
    return workspaceKey;
  }

  async unlockWorkspaceKey(workspaceId: string, masterPassword?: string): Promise<Buffer> {
    const record = this.store.get(workspaceId);
    if (record === undefined) throw new WorkspaceNotFound();
    const unwrapped = await this.unwrapFromKeychain(workspaceId, record);
    if (record.passwordKdf === undefined) return unwrapped;
    try {
      return await this.openWithPassword({
        workspaceId,
        sealed: unwrapped,
        kdf: record.passwordKdf,
        masterPassword,
      });
    } finally {
      unwrapped.fill(0);
    }
  }

  forgetWorkspaceKey(workspaceId: string): void {
    this.store.remove(workspaceId);
  }

  private async wrapKey(
    workspaceId: string,
    workspaceKey: Buffer,
    masterPassword?: string,
  ): Promise<KeyRecord> {
    if (masterPassword === undefined) {
      return { wrappedKey: (await this.keychain.protect(workspaceKey)).toString("base64") };
    }
    const passwordKdf = createKdfParams();
    const passwordKey = await deriveKeyFromPassword(masterPassword, passwordKdf);
    try {
      const sealed = sealWithKey(passwordKey, workspaceKey, workspaceId);
      return { wrappedKey: (await this.keychain.protect(sealed)).toString("base64"), passwordKdf };
    } finally {
      passwordKey.fill(0);
    }
  }

  private async openWithPassword({ workspaceId, sealed, kdf, masterPassword }: SealedKey): Promise<Buffer> {
    if (masterPassword === undefined) {
      throw new MasterPasswordRequired("Enter the master password to unlock this workspace.");
    }
    this.#attempts.assertCanAttempt(workspaceId);
    const passwordKey = await deriveKeyFromPassword(masterPassword, kdf);
    try {
      const workspaceKey = openWithKey(passwordKey, sealed, workspaceId);
      this.#attempts.recordSuccess(workspaceId);
      return workspaceKey;
    } catch {
      this.#attempts.recordFailure(workspaceId);
      throw new WrongMasterPassword();
    } finally {
      passwordKey.fill(0);
    }
  }

  /** Removes the keychain layer; re-wraps and saves the record if the OS rotated its key. */
  private async unwrapFromKeychain(workspaceId: string, record: KeyRecord): Promise<Buffer> {
    const { data, shouldProtectAgain } = await this.keychain.unprotect(
      Buffer.from(record.wrappedKey, "base64"),
    );
    if (shouldProtectAgain) {
      const wrappedKey = (await this.keychain.protect(data)).toString("base64");
      this.store.put(workspaceId, { ...record, wrappedKey });
    }
    return data;
  }
}
