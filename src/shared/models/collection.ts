import { z } from "zod";
import { MAX_NAME_LENGTH } from "../limits";
import { WorkspaceId } from "./workspace";

export const EntityId = z.uuid();
export const EntityName = z.string().trim().min(1).max(MAX_NAME_LENGTH);

export const ItemKinds = ["folder", "request"] as const;
export const ItemKind = z.enum(ItemKinds);
export type ItemKind = z.infer<typeof ItemKind>;

export const Collection = z.object({ id: EntityId, name: EntityName });
export type Collection = z.infer<typeof Collection>;

/** A folder or request. parentId is null at the top level of its collection. */
export const TreeItem = z.object({
  id: EntityId,
  collectionId: EntityId,
  parentId: EntityId.nullable(),
  kind: ItemKind,
  name: EntityName,
  /** The request's HTTP method, shown as a coloured badge. Null for folders. */
  method: z.string().max(24).nullable(),
});
export type TreeItem = z.infer<typeof TreeItem>;

export const CollectionTree = z.object({
  collections: z.array(Collection),
  items: z.array(TreeItem),
});
export type CollectionTree = z.infer<typeof CollectionTree>;

export const WorkspaceScoped = z.object({ workspaceId: WorkspaceId });

export const CreateCollectionInput = WorkspaceScoped.extend({ name: EntityName });

export const CreateItemInput = WorkspaceScoped.extend({
  collectionId: EntityId,
  parentId: EntityId.nullable(),
  kind: ItemKind,
  name: EntityName,
});
export type CreateItemInput = z.infer<typeof CreateItemInput>;

/** Renames or deletes a collection or an item; `id` may name either. */
export const RenameEntityInput = WorkspaceScoped.extend({ id: EntityId, name: EntityName });
export const EntityInput = WorkspaceScoped.extend({ id: EntityId });

/** Moves an item to the end of a collection's top level (parentId null) or of a folder. */
export const MoveItemInput = WorkspaceScoped.extend({
  itemId: EntityId,
  collectionId: EntityId,
  parentId: EntityId.nullable(),
  /** Place it just before this sibling; null or absent puts it last. */
  beforeItemId: EntityId.nullable().optional(),
});
export type MoveItemInput = z.infer<typeof MoveItemInput>;

/** Reorders collections: this one goes just before `beforeId`, or last when that is null. */
export const MoveCollectionInput = WorkspaceScoped.extend({ id: EntityId, beforeId: EntityId.nullable() });

/** The auth a collection or folder passes down to the requests inside it. */
export const ContainerAuthInput = WorkspaceScoped.extend({ id: EntityId });
