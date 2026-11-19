import { z } from "zod";
import { RequestAuth } from "@shared/models/auth";
import { MAX_DESCRIPTION_LENGTH } from "@shared/limits";
import { Scripts } from "@shared/models/scripts";
import { EntityName, ItemKind } from "@shared/models/collection";
import { VariableKey } from "@shared/models/environment";
import { RequestDefinition } from "@shared/models/request";
import { WorkspaceName } from "@shared/models/workspace";
import { MAX_VALUE_LENGTH, MAX_VARIABLES_PER_SCOPE } from "@shared/limits";
import { MAX_IMPORTED_ITEMS } from "../import-limits";

const BundleVariable = z.object({
  key: VariableKey,
  value: z.string().max(MAX_VALUE_LENGTH),
  /** Written by older versions; ignored. */
  isSecret: z.boolean().optional(),
  isEnabled: z.boolean(),
});
const VariableSet = z.array(BundleVariable).max(MAX_VARIABLES_PER_SCOPE);
/** Ids inside a bundle only link its own parts together; every id is replaced on import. */
const LocalId = z.string().min(1).max(64);

/** A collection's or folder's description and scripts (bundles from before them have none). */
const ContainerExtras = {
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  scripts: Scripts.optional(),
};

/** Everything a workspace holds that moves between machines. History and settings stay behind. */
export const BundleContent = z.object({
  format: z.literal("reqlab-workspace"),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  workspaceName: WorkspaceName,
  includesSecrets: z.boolean(),
  globals: VariableSet,
  collections: z
    .array(
      z.object({
        id: LocalId,
        name: EntityName,
        variables: VariableSet,
        auth: RequestAuth.optional(),
        ...ContainerExtras,
      }),
    )
    .max(1_000),
  /** Parents always come before their children. */
  items: z
    .array(
      z.object({
        id: LocalId,
        collectionId: LocalId,
        parentId: LocalId.nullable(),
        kind: ItemKind,
        name: EntityName,
        definition: RequestDefinition.optional(),
        /** A folder's own auth. */
        auth: RequestAuth.optional(),
        ...ContainerExtras,
      }),
    )
    .max(MAX_IMPORTED_ITEMS),
  environments: z.array(z.object({ name: EntityName, variables: VariableSet })).max(1_000),
});
export type BundleContent = z.infer<typeof BundleContent>;
export type BundleItem = BundleContent["items"][number];
