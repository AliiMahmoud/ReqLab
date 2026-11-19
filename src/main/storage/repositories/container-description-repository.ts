import { ItemNotFound } from "../../errors";
import type { SqliteDatabase } from "../database";

/** The documentation text of a collection or a folder (kept for Postman import / export). */
export class ContainerDescriptionRepository {
  constructor(private readonly database: SqliteDatabase) {}

  read(id: string): string {
    const row: unknown =
      this.database.prepare("SELECT description FROM collections WHERE id = ?").pluck().get(id) ??
      this.database.prepare("SELECT description FROM folders WHERE item_id = ?").pluck().get(id);
    return typeof row === "string" ? row : "";
  }

  write(id: string, description: string): void {
    const value = description;
    const collections = this.database
      .prepare("UPDATE collections SET description = ? WHERE id = ?")
      .run(value, id);
    if (collections.changes > 0) return;
    const folders = this.database
      .prepare("UPDATE folders SET description = ? WHERE item_id = ?")
      .run(value, id);
    if (folders.changes === 0) throw new ItemNotFound();
  }
}
