import type { SqliteDatabase } from "../database";

export interface Migration {
  version: number;
  name: string;
  up(database: SqliteDatabase): void;
}
