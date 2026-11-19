import type { z } from "zod";
import type { SqliteDatabase } from "../database";
import { readJsonColumn } from "./json-column";

/** Small per-workspace preferences, each stored as JSON under a key and read back through a schema. */
export class SettingsRepository {
  constructor(private readonly database: SqliteDatabase) {}

  read<T extends z.ZodType>(key: string, schema: T): z.output<T> | undefined {
    const text: unknown = this.database
      .prepare("SELECT value_json FROM settings WHERE key = ?")
      .pluck()
      .get(key);
    return text === undefined ? undefined : readJsonColumn(schema, text);
  }

  remove(key: string): void {
    this.database.prepare("DELETE FROM settings WHERE key = ?").run(key);
  }

  write(key: string, value: unknown): void {
    this.database
      .prepare(
        "INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json",
      )
      .run(key, JSON.stringify(value));
  }
}
