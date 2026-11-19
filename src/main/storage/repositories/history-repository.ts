import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { HistoryEntry } from "@shared/models/history";
import { RequestDefinition } from "@shared/models/request";
import { MAX_HISTORY_ENTRIES } from "@shared/limits";
import type { SqliteDatabase } from "../database";
import { readJsonColumn } from "./json-column";

const HistoryRow = z.object({
  id: z.string(),
  sent_at: z.string(),
  status: z.number().int().nullable(),
  duration_ms: z.number().nullable(),
  definition_json: z.string(),
});

export type NewHistoryEntry = Omit<HistoryEntry, "id">;

/** The most recent sent requests. Older entries are pruned as new ones arrive. */
export class HistoryRepository {
  constructor(private readonly database: SqliteDatabase) {}

  list(): HistoryEntry[] {
    return this.database
      .prepare("SELECT * FROM history ORDER BY sent_at DESC LIMIT ?")
      .all(MAX_HISTORY_ENTRIES)
      .map((row) => toEntry(HistoryRow.parse(row)));
  }

  add(entry: NewHistoryEntry): void {
    this.database.transaction(() => {
      this.database
        .prepare(
          "INSERT INTO history (id, sent_at, status, duration_ms, definition_json) VALUES (?, ?, ?, ?, ?)",
        )
        .run(randomUUID(), entry.sentAt, entry.status, entry.durationMs, JSON.stringify(entry.definition));
      this.database
        .prepare("DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY sent_at DESC LIMIT ?)")
        .run(MAX_HISTORY_ENTRIES);
    })();
  }

  clear(): void {
    this.database.prepare("DELETE FROM history").run();
  }
}

function toEntry(row: z.infer<typeof HistoryRow>): HistoryEntry {
  return {
    id: row.id,
    sentAt: row.sent_at,
    status: row.status,
    durationMs: row.duration_ms,
    definition: readJsonColumn(RequestDefinition, row.definition_json),
  };
}
