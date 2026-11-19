import type { SqliteDatabase } from "../database";
import type { Migration } from "./migration";
import { createPhaseOneTables } from "./workspace-phase-one";

/** Schema of each encrypted workspace file. Forward-only: never edit a released migration. */
export const workspaceMigrations: readonly Migration[] = [
  {
    version: 1,
    name: "create workspace_meta",
    up: (database: SqliteDatabase): void => {
      database.exec(`
        CREATE TABLE workspace_meta (
          id             TEXT    PRIMARY KEY,
          name           TEXT    NOT NULL,
          created_at     TEXT    NOT NULL,
          format_version INTEGER NOT NULL
        ) STRICT
      `);
    },
  },
  { version: 2, name: "create collections, requests, environments, history", up: createPhaseOneTables },
  {
    version: 3,
    name: "add auth to collections and folders",
    up: (database: SqliteDatabase): void => {
      database.exec("ALTER TABLE collections ADD COLUMN auth_json TEXT");
      database.exec("ALTER TABLE folders ADD COLUMN auth_json TEXT");
    },
  },
  {
    version: 4,
    name: "mark host-only cookies",
    up: (database: SqliteDatabase): void => {
      // A cookie set without Domain= belongs to its exact host only (RFC 6265 section 5.3).
      database.exec(
        "ALTER TABLE cookies ADD COLUMN is_host_only INTEGER NOT NULL DEFAULT 1 CHECK (is_host_only IN (0, 1))",
      );
    },
  },
  {
    version: 5,
    name: "protected environments",
    up: (database: SqliteDatabase): void => {
      database.exec(
        "ALTER TABLE environments ADD COLUMN is_protected INTEGER NOT NULL DEFAULT 0 CHECK (is_protected IN (0, 1))",
      );
    },
  },
  {
    version: 6,
    name: "environment colour tags",
    up: (database: SqliteDatabase): void => {
      database.exec("ALTER TABLE environments ADD COLUMN color TEXT");
    },
  },
  {
    version: 7,
    name: "no more secret variables (values stay encrypted with the workspace file)",
    up: (database: SqliteDatabase): void => {
      database.exec("UPDATE variables SET is_secret = 0");
    },
  },
  {
    version: 8,
    name: "collection descriptions (folders have had one from the start)",
    up: (database: SqliteDatabase): void => {
      database.exec("ALTER TABLE collections ADD COLUMN description TEXT NOT NULL DEFAULT ''");
    },
  },
  {
    version: 9,
    name: "pre-request / post-response scripts on collections and folders (null = none)",
    up: (database: SqliteDatabase): void => {
      database.exec("ALTER TABLE collections ADD COLUMN scripts_json TEXT");
      database.exec("ALTER TABLE folders ADD COLUMN scripts_json TEXT");
    },
  },
];
