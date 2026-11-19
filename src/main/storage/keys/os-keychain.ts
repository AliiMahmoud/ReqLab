import { safeStorage } from "electron";
import { KeychainUnavailable } from "../../errors";

const BACKEND_BY_PLATFORM: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "macos_keychain",
  win32: "windows_dpapi",
};

/** Linux without a keyring: Electron "encrypts" with a hard-coded key. That protects nothing. */
const WEAK_BACKENDS = new Set(["basic_text", "unknown"]);

export interface UnprotectedData {
  data: Buffer;
  /** The OS rotated or upgraded its key: wrap the data again and store the new copy. */
  shouldProtectAgain: boolean;
}

/**
 * Wraps bytes with the operating system's protected storage
 * (macOS Keychain, Windows DPAPI, Linux libsecret/kwallet).
 * Note: safeStorage works on strings, so a base64 copy of the key briefly exists as an
 * immutable JS string that cannot be zeroed. It never leaves the main process.
 */
export class OsKeychain {
  backendName(): string {
    if (process.platform === "linux") return safeStorage.getSelectedStorageBackend();
    return BACKEND_BY_PLATFORM[process.platform] ?? "unknown";
  }

  async isWeak(): Promise<boolean> {
    return !(await safeStorage.isAsyncEncryptionAvailable()) || WEAK_BACKENDS.has(this.backendName());
  }

  async protect(data: Buffer): Promise<Buffer> {
    await this.assertAvailable();
    return safeStorage.encryptStringAsync(data.toString("base64"));
  }

  async unprotect(data: Buffer): Promise<UnprotectedData> {
    await this.assertAvailable();
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(data);
    return { data: Buffer.from(result, "base64"), shouldProtectAgain: shouldReEncrypt };
  }

  private async assertAvailable(): Promise<void> {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new KeychainUnavailable();
  }
}
