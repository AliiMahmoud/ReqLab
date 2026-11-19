import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Collection, ItemKind, type CollectionTree, type TreeItem } from "@shared/models/collection";
import { createEmptyRequest } from "@shared/request-defaults";
import { InvalidMove, ItemNotFound } from "../../errors";
import type { SqliteDatabase } from "../database";

const ItemRow = z.object({
  id: z.string(),
  collection_id: z.string(),
  parent_id: z.string().nullable(),
  kind: ItemKind,
  name: z.string(),
  method: z.string().nullable(),
});

/** Items with their request's method (read straight from the stored JSON). */
const SELECT_ALL_ITEMS = `
  SELECT items.id, collection_id, parent_id, kind, name, json_extract(definition_json, '$.method') AS method
  FROM items LEFT JOIN requests ON requests.item_id = items.id
  ORDER BY sort_order`;
const SELECT_ONE_ITEM = `
  SELECT items.id, collection_id, parent_id, kind, name, json_extract(definition_json, '$.method') AS method
  FROM items LEFT JOIN requests ON requests.item_id = items.id
  WHERE items.id = ?`;

export interface NewItem {
  collectionId: string;
  parentId: string | null;
  kind: ItemKind;
  name: string;
}

/** The collection tree: collections, folders and requests, and their order. */
interface MoveTarget {
  collectionId: string;
  parentId: string | null;
  beforeItemId?: string | null | undefined;
}

export class CollectionRepository {
  constructor(private readonly database: SqliteDatabase) {}

  readTree(): CollectionTree {
    const collections = this.database
      .prepare("SELECT id, name FROM collections ORDER BY sort_order, name")
      .all()
      .map((row) => Collection.parse(row));
    const items = this.database
      .prepare(SELECT_ALL_ITEMS)
      .all()
      .map((row) => toTreeItem(ItemRow.parse(row)));
    return { collections, items };
  }

  /** Puts a collection just before another one (or last when `beforeId` is null) and renumbers them. */
  moveCollection(id: string, beforeId: string | null): void {
    const rows: unknown[] = this.database
      .prepare("SELECT id FROM collections ORDER BY sort_order, name")
      .pluck()
      .all();
    const ids = rows.filter((row): row is string => typeof row === "string");
    if (!ids.includes(id)) throw new ItemNotFound();
    const rest = ids.filter((candidate) => candidate !== id);
    const index = beforeId === null ? rest.length : rest.indexOf(beforeId);
    if (index === -1) throw new InvalidMove();
    rest.splice(index, 0, id);
    const update = this.database.prepare("UPDATE collections SET sort_order = ? WHERE id = ?");
    this.database.transaction(() => {
      rest.forEach((collectionId, order) => update.run(order, collectionId));
    })();
  }

  createCollection(name: string): Collection {
    const collection = { id: randomUUID(), name };
    const nextOrder = this.nextOrder("SELECT MAX(sort_order) FROM collections");
    this.database
      .prepare("INSERT INTO collections (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)")
      .run(collection.id, name, nextOrder, new Date().toISOString());
    return collection;
  }

  createItem(item: NewItem): TreeItem {
    this.assertValidParent(item.collectionId, item.parentId);
    const created: TreeItem = { id: randomUUID(), ...item, method: item.kind === "request" ? "GET" : null };
    this.database.transaction(() => {
      this.database
        .prepare(
          "INSERT INTO items (id, collection_id, parent_id, kind, name, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(created.id, item.collectionId, item.parentId, item.kind, item.name, this.nextChildOrder(item));
      this.insertDetails(created);
    })();
    return created;
  }

  /** Renames a collection or an item. */
  rename(id: string, name: string): void {
    const renamedCollections = this.database
      .prepare("UPDATE collections SET name = ? WHERE id = ?")
      .run(name, id);
    if (renamedCollections.changes > 0) return;
    const renamedItems = this.database.prepare("UPDATE items SET name = ? WHERE id = ?").run(name, id);
    if (renamedItems.changes === 0) throw new ItemNotFound();
  }

  /** Deletes a collection or an item, with everything inside it. */
  delete(id: string): void {
    this.database.transaction(() => {
      const deletedCollections = this.database.prepare("DELETE FROM collections WHERE id = ?").run(id);
      if (deletedCollections.changes > 0) {
        this.database.prepare("DELETE FROM variables WHERE scope = 'collection' AND scope_id = ?").run(id);
        return;
      }
      if (this.database.prepare("DELETE FROM items WHERE id = ?").run(id).changes === 0)
        throw new ItemNotFound();
    })();
  }

  /** Moves an item (with everything inside it) to a collection or folder, last or before a sibling. */
  moveItem(itemId: string, target: MoveTarget): void {
    if (this.findItem(itemId) === undefined) throw new ItemNotFound();
    this.assertValidParent(target.collectionId, target.parentId);
    if (target.parentId !== null && this.isSelfOrDescendant(target.parentId, itemId)) throw new InvalidMove();
    this.database.transaction(() => {
      this.database
        .prepare("UPDATE items SET parent_id = ?, sort_order = ? WHERE id = ?")
        .run(target.parentId, this.nextChildOrder(target), itemId);
      this.moveSubtreeToCollection(itemId, target.collectionId);
      const beforeItemId = target.beforeItemId ?? null;
      if (beforeItemId !== null && beforeItemId !== itemId) this.placeBefore(itemId, beforeItemId, target);
    })();
  }

  /** Renumbers the siblings 0, 1, 2… with the item just before `beforeItemId` (ignored if not a sibling). */
  private placeBefore(itemId: string, beforeItemId: string, place: MoveTarget): void {
    const siblings: unknown[] = this.database
      .prepare(
        "SELECT id FROM items WHERE collection_id = ? AND parent_id IS ? AND id != ? ORDER BY sort_order",
      )
      .pluck()
      .all(place.collectionId, place.parentId, itemId);
    const ids = siblings.filter((id): id is string => typeof id === "string");
    const index = ids.indexOf(beforeItemId);
    if (index === -1) return;
    ids.splice(index, 0, itemId);
    const update = this.database.prepare("UPDATE items SET sort_order = ? WHERE id = ?");
    ids.forEach((id, order) => update.run(order, id));
  }

  findItem(itemId: string): TreeItem | undefined {
    const row = this.database.prepare(SELECT_ONE_ITEM).get(itemId);
    return row === undefined ? undefined : toTreeItem(ItemRow.parse(row));
  }

  private assertValidParent(collectionId: string, parentId: string | null): void {
    const collection = this.database.prepare("SELECT 1 FROM collections WHERE id = ?").get(collectionId);
    if (collection === undefined) throw new ItemNotFound();
    if (parentId === null) return;
    const parent = this.findItem(parentId);
    if (parent?.kind !== "folder" || parent.collectionId !== collectionId) throw new InvalidMove();
  }

  /** True when `candidateId` is `ancestorId` itself or sits anywhere below it. */
  private isSelfOrDescendant(candidateId: string, ancestorId: string): boolean {
    const row = this.database
      .prepare(
        `WITH RECURSIVE chain(id, parent_id) AS (
           SELECT id, parent_id FROM items WHERE id = ?
           UNION ALL SELECT items.id, items.parent_id FROM items JOIN chain ON items.id = chain.parent_id
         ) SELECT 1 FROM chain WHERE id = ?`,
      )
      .get(candidateId, ancestorId);
    return row !== undefined;
  }

  private moveSubtreeToCollection(itemId: string, collectionId: string): void {
    this.database
      .prepare(
        `WITH RECURSIVE subtree(id) AS (
           SELECT ? UNION ALL SELECT items.id FROM items JOIN subtree ON items.parent_id = subtree.id
         ) UPDATE items SET collection_id = ? WHERE id IN (SELECT id FROM subtree)`,
      )
      .run(itemId, collectionId);
  }

  private insertDetails(item: TreeItem): void {
    if (item.kind === "folder") {
      this.database.prepare("INSERT INTO folders (item_id) VALUES (?)").run(item.id);
      return;
    }
    this.database
      .prepare("INSERT INTO requests (item_id, definition_json) VALUES (?, ?)")
      .run(item.id, JSON.stringify(createEmptyRequest()));
  }

  private nextChildOrder(place: { collectionId: string; parentId: string | null }): number {
    const row: unknown = this.database
      .prepare("SELECT MAX(sort_order) FROM items WHERE collection_id = ? AND parent_id IS ?")
      .pluck()
      .get(place.collectionId, place.parentId);
    return typeof row === "number" ? row + 1 : 0;
  }

  private nextOrder(sql: string): number {
    const row: unknown = this.database.prepare(sql).pluck().get();
    return typeof row === "number" ? row + 1 : 0;
  }
}

function toTreeItem(row: z.infer<typeof ItemRow>): TreeItem {
  return {
    id: row.id,
    collectionId: row.collection_id,
    parentId: row.parent_id,
    kind: row.kind,
    name: row.name,
    method: row.method,
  };
}
