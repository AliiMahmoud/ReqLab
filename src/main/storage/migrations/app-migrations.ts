import type { SqliteDatabase } from "../database";
import type { Migration } from "./migration";

/** Schema of app.db: the workspace list and app preferences, shown before anything is unlocked. No secrets. */
export const appMigrations: readonly Migration[] = [
  {
    version: 1,
    name: "create workspaces",
    up: (database: SqliteDatabase): void => {
      database.exec(`
        CREATE TABLE workspaces (
          id                  TEXT    PRIMARY KEY,
          name                TEXT    NOT NULL,
          created_at          TEXT    NOT NULL,
          has_master_password INTEGER NOT NULL CHECK (has_master_password IN (0, 1))
        ) STRICT
      `);
    },
  },
  {
    version: 2,
    name: "create app_settings",
    up: (database: SqliteDatabase): void => {
      database.exec(`
        CREATE TABLE app_settings (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        ) STRICT
      `);
    },
  },
];
