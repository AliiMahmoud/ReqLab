import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import type { CreateWorkspaceInput, UnlockWorkspaceInput, WorkspaceSummary } from "@shared/models/workspace";
import { ConfirmationMismatch, WorkspaceLocked, WorkspaceNotFound } from "../errors";
import type { AppRegistry, WorkspaceRecord } from "../storage/app-registry";
import { openEncryptedDatabase, type SqliteDatabase } from "../storage/database";
import type { KeyManager } from "../storage/keys/key-manager";
import { runPendingMigrations } from "../storage/migrations/run-migrations";
import { workspaceMigrations } from "../storage/migrations/workspace-migrations";
import type { StoragePaths } from "../storage/storage-paths";

const WORKSPACE_FORMAT_VERSION = 1;

/** Creates, unlocks and locks workspaces. An unlocked workspace = an open, decrypted database. */
export class WorkspaceService {
  readonly #unlocked = new Map<string, SqliteDatabase>();

  constructor(
    private readonly registry: AppRegistry,
    private readonly keys: KeyManager,
    private readonly paths: StoragePaths,
  ) {}

  listWorkspaces(): WorkspaceSummary[] {
    return this.registry.listWorkspaces().map((record) => this.toSummary(record));
  }

  async createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceSummary> {
    const record: WorkspaceRecord = {
      id: randomUUID(),
      name: input.name,
      createdAt: new Date().toISOString(),
      hasMasterPassword: input.masterPassword !== undefined,
    };
    const key = await this.keys.createWorkspaceKey(record.id, input.masterPassword);
    try {
      this.#unlocked.set(record.id, this.createWorkspaceDatabase(record, key));
    } catch (error) {
      this.keys.forgetWorkspaceKey(record.id);
      throw error;
    } finally {
      key.fill(0);
    }
    this.registry.addWorkspace(record);
    this.registry.writeLastWorkspaceId(record.id);
    return this.toSummary(record);
  }

  async unlockWorkspace(input: UnlockWorkspaceInput): Promise<WorkspaceSummary> {
    const record = this.requireRecord(input.workspaceId);
    this.registry.writeLastWorkspaceId(record.id);
    if (this.#unlocked.has(record.id)) return this.toSummary(record);
    const key = await this.keys.unlockWorkspaceKey(record.id, input.masterPassword);
    try {
      const database = openEncryptedDatabase(this.paths.workspaceDatabase(record.id), key);
      runPendingMigrations(database, workspaceMigrations);
      this.#unlocked.set(record.id, database);
    } finally {
      key.fill(0);
    }
    return this.toSummary(record);
  }

  lockWorkspace(workspaceId: string): WorkspaceSummary {
    const record = this.requireRecord(workspaceId);
    this.#unlocked.get(workspaceId)?.close();
    this.#unlocked.delete(workspaceId);
    return this.toSummary(record);
  }

  renameWorkspace(workspaceId: string, name: string): WorkspaceSummary {
    const database = this.requireUnlockedDatabase(workspaceId);
    database.prepare("UPDATE workspace_meta SET name = ? WHERE id = ?").run(name, workspaceId);
    this.registry.renameWorkspace(workspaceId, name);
    return this.toSummary(this.requireRecord(workspaceId));
  }

  /** Permanent. The workspace must be unlocked (proof of access) and its name typed again. */
  deleteWorkspace(workspaceId: string, confirmationName: string): void {
    const record = this.requireRecord(workspaceId);
    this.requireUnlockedDatabase(workspaceId);
    if (confirmationName.trim() !== record.name) throw new ConfirmationMismatch();
    this.lockWorkspace(workspaceId);
    this.keys.forgetWorkspaceKey(workspaceId);
    for (const file of this.paths.workspaceFiles(workspaceId)) rmSync(file, { force: true });
    this.registry.removeWorkspace(workspaceId);
    if (this.registry.readLastWorkspaceId() === workspaceId) this.registry.writeLastWorkspaceId(null);
  }

  /** The last workspace opened, if it still exists. */
  /** The next launch opens this one (only a workspace that exists). */
  rememberLastWorkspace(workspaceId: string): void {
    this.registry.writeLastWorkspaceId(this.requireRecord(workspaceId).id);
  }

  findLastWorkspace(): WorkspaceSummary | null {
    const lastId = this.registry.readLastWorkspaceId();
    const record = lastId === null ? undefined : this.registry.findWorkspace(lastId);
    return record === undefined ? null : this.toSummary(record);
  }

  /** Returns how many workspaces were open. */
  lockAll(): number {
    const count = this.#unlocked.size;
    for (const database of this.#unlocked.values()) database.close();
    this.#unlocked.clear();
    return count;
  }

  /** For repositories: the decrypted database of an unlocked workspace. */
  requireUnlockedDatabase(workspaceId: string): SqliteDatabase {
    const database = this.#unlocked.get(workspaceId);
    if (database === undefined) throw new WorkspaceLocked();
    return database;
  }

  private createWorkspaceDatabase(record: WorkspaceRecord, key: Buffer): SqliteDatabase {
    const database = openEncryptedDatabase(this.paths.workspaceDatabase(record.id), key);
    runPendingMigrations(database, workspaceMigrations);
    database
      .prepare("INSERT INTO workspace_meta (id, name, created_at, format_version) VALUES (?, ?, ?, ?)")
      .run(record.id, record.name, record.createdAt, WORKSPACE_FORMAT_VERSION);
    return database;
  }

  private requireRecord(workspaceId: string): WorkspaceRecord {
    const record = this.registry.findWorkspace(workspaceId);
    if (record === undefined) throw new WorkspaceNotFound();
    return record;
  }

  private toSummary(record: WorkspaceRecord): WorkspaceSummary {
    return { ...record, isUnlocked: this.#unlocked.has(record.id) };
  }
}
