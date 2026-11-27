import { RequestDefinition } from "@shared/models/request";
import { ItemNotFound } from "../../errors";
import type { SqliteDatabase } from "../database";
import { readJsonColumn } from "./json-column";

/** The saved contents of request items. */
export class RequestRepository {
  constructor(private readonly database: SqliteDatabase) {}

  get(itemId: string): RequestDefinition {
    const text: unknown = this.database
      .prepare("SELECT definition_json FROM requests WHERE item_id = ?")
      .pluck()
      .get(itemId);
    if (text === undefined) throw new ItemNotFound();
    return readJsonColumn(RequestDefinition, text);
  }

  /** Every header name the workspace's saved requests use, once each (case-insensitive), A–Z. */
  headerNames(): string[] {
    const names: unknown[] = this.database
      .prepare(
        `SELECT json_extract(header.value, '$.key') AS name
         FROM requests, json_each(requests.definition_json, '$.headers') AS header
         WHERE trim(coalesce(name, '')) <> ''
         GROUP BY lower(trim(name))
         ORDER BY lower(trim(name))
         LIMIT 500`,
      )
      .pluck()
      .all();
    return names.filter((name): name is string => typeof name === "string").map((name) => name.trim());
  }

  save(itemId: string, definition: RequestDefinition): void {
    const result = this.database
      .prepare("UPDATE requests SET definition_json = ? WHERE item_id = ?")
      .run(JSON.stringify(definition), itemId);
    if (result.changes === 0) throw new ItemNotFound();
  }
}
