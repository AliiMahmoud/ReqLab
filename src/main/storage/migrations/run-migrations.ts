import type { SqliteDatabase } from "../database";
import type { Migration } from "./migration";

/** Forward-only. Each migration runs in its own transaction and is recorded once applied. */
export function runPendingMigrations(database: SqliteDatabase, migrations: readonly Migration[]): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT    NOT NULL,
      applied_at TEXT    NOT NULL
    ) STRICT
  `);
  const applied = new Set(database.prepare("SELECT version FROM schema_migrations").pluck().all());
  for (const migration of migrations) {
    if (!applied.has(migration.version)) applyMigration(database, migration);
  }
}

function applyMigration(database: SqliteDatabase, migration: Migration): void {
  const recordMigration = database.prepare(
    "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
  );
  database.transaction(() => {
    migration.up(database);
    recordMigration.run(migration.version, migration.name, new Date().toISOString());
  })();
}
