import { mkdirSync } from "node:fs";
import { join } from "node:path";

const WORKSPACE_ID = /^[0-9a-f-]{36}$/;

/** Every file ReqLab writes lives under one folder, readable only by the current user. */
export class StoragePaths {
  constructor(private readonly root: string) {
    mkdirSync(join(root, "workspaces"), { recursive: true, mode: 0o700 });
  }

  appDatabase(): string {
    return join(this.root, "app.db");
  }

  keyFile(): string {
    return join(this.root, "keys.json");
  }

  workspaceDatabase(workspaceId: string): string {
    if (!WORKSPACE_ID.test(workspaceId)) throw new Error("Invalid workspace id.");
    return join(this.root, "workspaces", `${workspaceId}.rldb`);
  }

  /** The database file plus the journal files SQLite keeps beside it. */
  workspaceFiles(workspaceId: string): string[] {
    const database = this.workspaceDatabase(workspaceId);
    return [database, `${database}-wal`, `${database}-shm`];
  }
}
