import { NO_SCRIPTS, Scripts } from "@shared/models/scripts";
import { ItemNotFound } from "../../errors";
import type { SqliteDatabase } from "../database";
import { readJsonColumn } from "./json-column";

/** The pre-request / post-response scripts of a collection or a folder. */
export class ContainerScriptsRepository {
  constructor(private readonly database: SqliteDatabase) {}

  read(id: string): Scripts {
    const row: unknown =
      this.database.prepare("SELECT scripts_json FROM collections WHERE id = ?").pluck().get(id) ??
      this.database.prepare("SELECT scripts_json FROM folders WHERE item_id = ?").pluck().get(id);
    return typeof row === "string" ? readJsonColumn(Scripts, row) : NO_SCRIPTS;
  }

  write(id: string, scripts: Scripts): void {
    const json = JSON.stringify(Scripts.parse(scripts));
    const collections = this.database
      .prepare("UPDATE collections SET scripts_json = ? WHERE id = ?")
      .run(json, id);
    if (collections.changes > 0) return;
    const folders = this.database
      .prepare("UPDATE folders SET scripts_json = ? WHERE item_id = ?")
      .run(json, id);
    if (folders.changes === 0) throw new ItemNotFound();
  }
}
