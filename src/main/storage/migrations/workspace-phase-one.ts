import type { SqliteDatabase } from "../database";

const COLLECTIONS = `
CREATE TABLE collections (
  id         TEXT    PRIMARY KEY,
  name       TEXT    NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT    NOT NULL
) STRICT;
`;

const ITEMS = `
CREATE TABLE items (
  id            TEXT    PRIMARY KEY,
  collection_id TEXT    NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  parent_id     TEXT    REFERENCES items (id) ON DELETE CASCADE,
  kind          TEXT    NOT NULL CHECK (kind IN ('folder', 'request')),
  name          TEXT    NOT NULL,
  sort_order    INTEGER NOT NULL
) STRICT;
CREATE INDEX items_by_parent ON items (collection_id, parent_id, sort_order);
`;

const FOLDERS = `
CREATE TABLE folders (
  item_id     TEXT PRIMARY KEY REFERENCES items (id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT ''
) STRICT;
`;

const REQUESTS = `
CREATE TABLE requests (
  item_id         TEXT PRIMARY KEY REFERENCES items (id) ON DELETE CASCADE,
  definition_json TEXT NOT NULL
) STRICT;
`;

const EXAMPLES = `
CREATE TABLE examples (
  id              TEXT PRIMARY KEY,
  request_item_id TEXT NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  response_json   TEXT NOT NULL
) STRICT;
`;

const ENVIRONMENTS = `
CREATE TABLE environments (
  id         TEXT    PRIMARY KEY,
  name       TEXT    NOT NULL,
  sort_order INTEGER NOT NULL
) STRICT;
`;

const VARIABLES = `
CREATE TABLE variables (
  scope      TEXT    NOT NULL CHECK (scope IN ('global', 'collection', 'folder', 'environment')),
  scope_id   TEXT    NOT NULL,
  sort_order INTEGER NOT NULL,
  key        TEXT    NOT NULL,
  value      TEXT    NOT NULL,
  is_secret  INTEGER NOT NULL CHECK (is_secret IN (0, 1)),
  is_enabled INTEGER NOT NULL CHECK (is_enabled IN (0, 1)),
  PRIMARY KEY (scope, scope_id, sort_order)
) STRICT;
`;

const HISTORY = `
CREATE TABLE history (
  id              TEXT    PRIMARY KEY,
  sent_at         TEXT    NOT NULL,
  status          INTEGER,
  duration_ms     REAL,
  definition_json TEXT    NOT NULL
) STRICT;
CREATE INDEX history_by_time ON history (sent_at);
`;

const COOKIES = `
CREATE TABLE cookies (
  domain       TEXT    NOT NULL,
  path         TEXT    NOT NULL,
  name         TEXT    NOT NULL,
  value        TEXT    NOT NULL,
  expires_at   TEXT,
  is_secure    INTEGER NOT NULL CHECK (is_secure IN (0, 1)),
  is_http_only INTEGER NOT NULL CHECK (is_http_only IN (0, 1)),
  same_site    TEXT,
  PRIMARY KEY (domain, path, name)
) STRICT;
`;

const SETTINGS = `
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
) STRICT;
`;

/**
 * Collections hold a tree of items (folders and requests). Variables belong to one owner:
 * the globals (scope_id ''), a collection, a folder or an environment.
 */
export function createPhaseOneTables(database: SqliteDatabase): void {
  for (const statement of [
    COLLECTIONS,
    ITEMS,
    FOLDERS,
    REQUESTS,
    EXAMPLES,
    ENVIRONMENTS,
    VARIABLES,
    HISTORY,
    COOKIES,
    SETTINGS,
  ]) {
    database.exec(statement);
  }
}
