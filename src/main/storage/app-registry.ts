import { z } from "zod";
import type { SqliteDatabase } from "./database";
import { appMigrations } from "./migrations/app-migrations";
import { runPendingMigrations } from "./migrations/run-migrations";

const WorkspaceRow = z.object({
  id: z.uuid(),
  name: z.string(),
  created_at: z.iso.datetime(),
  has_master_password: z.union([z.literal(0), z.literal(1)]),
});

export interface WorkspaceRecord {
  id: string;
  name: string;
  createdAt: string;
  hasMasterPassword: boolean;
}

/** Repository for app.db's workspace list. */
export class AppRegistry {
  constructor(private readonly database: SqliteDatabase) {
    runPendingMigrations(database, appMigrations);
  }

  listWorkspaces(): WorkspaceRecord[] {
    const rows = this.database.prepare("SELECT * FROM workspaces ORDER BY name COLLATE NOCASE").all();
    return rows.map((row) => toRecord(WorkspaceRow.parse(row)));
  }

  findWorkspace(workspaceId: string): WorkspaceRecord | undefined {
    const row = this.database.prepare("SELECT * FROM workspaces WHERE id = ?").get(workspaceId);
    return row === undefined ? undefined : toRecord(WorkspaceRow.parse(row));
  }

  addWorkspace(record: WorkspaceRecord): void {
    this.database
      .prepare("INSERT INTO workspaces (id, name, created_at, has_master_password) VALUES (?, ?, ?, ?)")
      .run(record.id, record.name, record.createdAt, record.hasMasterPassword ? 1 : 0);
  }

  renameWorkspace(workspaceId: string, name: string): void {
    this.database.prepare("UPDATE workspaces SET name = ? WHERE id = ?").run(name, workspaceId);
  }

  removeWorkspace(workspaceId: string): void {
    this.database.prepare("DELETE FROM workspaces WHERE id = ?").run(workspaceId);
  }

  /** The workspace opened most recently, so the next launch can continue there. */
  readLastWorkspaceId(): string | null {
    const value: unknown = this.database
      .prepare("SELECT value FROM app_settings WHERE key = 'last-workspace-id'")
      .pluck()
      .get();
    const parsed = z.uuid().safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  writeLastWorkspaceId(workspaceId: string | null): void {
    if (workspaceId === null) {
      this.database.prepare("DELETE FROM app_settings WHERE key = 'last-workspace-id'").run();
      return;
    }
    this.database
      .prepare(
        "INSERT INTO app_settings (key, value) VALUES ('last-workspace-id', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      )
      .run(workspaceId);
  }

  close(): void {
    this.database.close();
  }
}

function toRecord(row: z.infer<typeof WorkspaceRow>): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    hasMasterPassword: row.has_master_password === 1,
  };
}
