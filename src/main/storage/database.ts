// The package ships its typings but its "exports" field hides them, so tsconfig.node.json maps them by path.
import Database from "better-sqlite3-multiple-ciphers";
import { DatabaseCorrupted } from "../errors";

export type SqliteDatabase = Database.Database;

const KEY_HEX = /^[0-9a-f]{64}$/;

/** Opens a workspace file encrypted with SQLCipher (AES-256) using a raw 256-bit key. */
export function openEncryptedDatabase(filePath: string, key: Buffer): SqliteDatabase {
  const database = new Database(filePath);
  try {
    applyEncryptionKey(database, key);
    assertIntegrity(database);
    applyHardening(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

/** For app.db, which holds no secrets (workspace list, UI preferences). */
export function openPlainDatabase(filePath: string): SqliteDatabase {
  const database = new Database(filePath);
  assertIntegrity(database);
  applyHardening(database);
  return database;
}

function applyEncryptionKey(database: SqliteDatabase, key: Buffer): void {
  const keyHex = key.toString("hex");
  if (!KEY_HEX.test(keyHex)) throw new Error("A workspace key must be exactly 32 bytes.");
  database.pragma("cipher = 'sqlcipher'");
  database.pragma("legacy = 4");
  // SQLite cannot bind PRAGMA arguments. Safe: keyHex is our own value, checked to be 64 hex chars above.
  // eslint-disable-next-line no-restricted-syntax
  database.pragma(`key = "x'${keyHex}'"`);
}

/**
 * - trusted_schema OFF: functions/views in a crafted file's schema cannot run with app privileges.
 * - secure_delete ON: deleted data is overwritten, not left in free pages.
 * Defensive mode (no writes to sqlite_master) is on by default in this SQLite build.
 */
function applyHardening(database: SqliteDatabase): void {
  database.pragma("trusted_schema = OFF");
  database.pragma("foreign_keys = ON");
  database.pragma("secure_delete = ON");
  database.pragma("journal_mode = WAL");
}

/** A wrong key or a damaged file fails here, before anything else touches the data. */
function assertIntegrity(database: SqliteDatabase): void {
  try {
    if (database.pragma("quick_check", { simple: true }) !== "ok") throw new DatabaseCorrupted();
  } catch {
    throw new DatabaseCorrupted();
  }
}
