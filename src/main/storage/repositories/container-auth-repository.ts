import { z } from "zod";
import { RequestAuth } from "@shared/models/auth";
import { ItemNotFound } from "../../errors";
import type { SqliteDatabase } from "../database";
import { readJsonColumn } from "./json-column";

const INHERIT: RequestAuth = { type: "inherit" };

const ChainRow = z.object({ auth_json: z.string().nullable() });

/** The auth that collections and folders pass down to their requests (the Composite part of the tree). */
export class ContainerAuthRepository {
  constructor(private readonly database: SqliteDatabase) {}

  /** A collection's or folder's own auth; "inherit" when none was set. */
  read(id: string): RequestAuth {
    const row = this.findRow(id);
    if (row === undefined) throw new ItemNotFound();
    return row.auth_json === null ? INHERIT : readJsonColumn(RequestAuth, row.auth_json);
  }

  write(id: string, auth: RequestAuth): void {
    const json = JSON.stringify(auth);
    const collections = this.database
      .prepare("UPDATE collections SET auth_json = ? WHERE id = ?")
      .run(json, id);
    if (collections.changes > 0) return;
    const folders = this.database.prepare("UPDATE folders SET auth_json = ? WHERE item_id = ?").run(json, id);
    if (folders.changes === 0) throw new ItemNotFound();
  }

  /**
   * The auth a request inherits: the nearest folder above it that does not inherit, else its
   * collection's, else none.
   */
  resolveInherited(itemId: string): RequestAuth {
    const chain = this.database
      .prepare(
        `WITH RECURSIVE ancestors(id, parent_id, depth) AS (
           SELECT id, parent_id, 0 FROM items WHERE id = ?
           UNION ALL SELECT items.id, items.parent_id, depth + 1 FROM items JOIN ancestors ON items.id = ancestors.parent_id
         )
         SELECT auth_json FROM (
           SELECT folders.auth_json AS auth_json, ancestors.depth AS depth
           FROM ancestors JOIN folders ON folders.item_id = ancestors.id WHERE ancestors.depth > 0
           UNION ALL
           SELECT collections.auth_json, 1000000
           FROM collections JOIN items ON items.collection_id = collections.id WHERE items.id = ?
         ) ORDER BY depth`,
      )
      .all(itemId, itemId)
      .map((row) => ChainRow.parse(row).auth_json);
    for (const json of chain) {
      const auth = json === null ? INHERIT : readJsonColumn(RequestAuth, json);
      if (auth.type !== "inherit") return auth;
    }
    return { type: "none" };
  }

  private findRow(id: string): z.infer<typeof ChainRow> | undefined {
    const row =
      this.database.prepare("SELECT auth_json FROM collections WHERE id = ?").get(id) ??
      this.database.prepare("SELECT auth_json FROM folders WHERE item_id = ?").get(id);
    return row === undefined ? undefined : ChainRow.parse(row);
  }
}
