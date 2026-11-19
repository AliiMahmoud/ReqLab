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

  save(itemId: string, definition: RequestDefinition): void {
    const result = this.database
      .prepare("UPDATE requests SET definition_json = ? WHERE item_id = ?")
      .run(JSON.stringify(definition), itemId);
    if (result.changes === 0) throw new ItemNotFound();
  }
}
