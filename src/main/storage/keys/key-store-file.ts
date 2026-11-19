import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { KdfParams } from "./password-key-derivation";

export const KeyRecord = z.object({
  /** The workspace key, wrapped by the OS keychain (and first by the master password, if any). */
  wrappedKey: z.base64(),
  /** Present only when the workspace has a master password. */
  passwordKdf: KdfParams.optional(),
});
export type KeyRecord = z.infer<typeof KeyRecord>;

const KeyFile = z.object({
  version: z.literal(1),
  workspaces: z.record(z.uuid(), KeyRecord),
});
type KeyFile = z.infer<typeof KeyFile>;

/** keys.json: ciphertext only. Written atomically and readable by the current user only. */
export class KeyStoreFile {
  constructor(private readonly filePath: string) {}

  get(workspaceId: string): KeyRecord | undefined {
    return this.read().workspaces[workspaceId];
  }

  put(workspaceId: string, record: KeyRecord): void {
    const file = this.read();
    file.workspaces[workspaceId] = record;
    this.write(file);
  }

  remove(workspaceId: string): void {
    const file = this.read();
    const remaining = Object.entries(file.workspaces).filter(([id]) => id !== workspaceId);
    this.write({ ...file, workspaces: Object.fromEntries(remaining) });
  }

  private read(): KeyFile {
    if (!existsSync(this.filePath)) return { version: 1, workspaces: {} };
    return KeyFile.parse(JSON.parse(readFileSync(this.filePath, "utf8")));
  }

  private write(file: KeyFile): void {
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(file, null, 2), { mode: 0o600 });
    renameSync(temporaryPath, this.filePath);
  }
}
