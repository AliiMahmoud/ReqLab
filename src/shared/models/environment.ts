import { z } from "zod";
import { MAX_KEY_LENGTH, MAX_VALUE_LENGTH, MAX_VARIABLES_PER_SCOPE } from "../limits";
import { EnvironmentColors } from "../environment-colors";
import { EntityId, EntityName, WorkspaceScoped } from "./collection";

export const Environment = z.object({
  id: EntityId,
  name: EntityName,
  /** Requests that change data (POST, PUT, PATCH, DELETE…) need a confirmation while it is active. */
  isProtected: z.boolean(),
  /** A colour tag shown beside its name; null when none was picked. */
  color: z.enum(EnvironmentColors).nullable(),
});
export type Environment = z.infer<typeof Environment>;

export const VariableScopes = ["global", "collection", "environment"] as const;
export const VariableScope = z.enum(VariableScopes);
export type VariableScope = z.infer<typeof VariableScope>;

/** Which set of variables: the globals, one collection's, or one environment's. */
export const VariableOwner = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("global") }),
  z.object({ scope: z.literal("collection"), id: EntityId }),
  z.object({ scope: z.literal("environment"), id: EntityId }),
]);
export type VariableOwner = z.infer<typeof VariableOwner>;

export const VariableKey = z
  .string()
  .trim()
  .min(1)
  .max(MAX_KEY_LENGTH)
  .regex(/^[^{}]+$/, "Variable names cannot contain { or }.");

/**
 * A variable as the UI sees it. There are no secret variables: every value is shown and edited
 * as it is. Values are protected at rest by the workspace's encrypted file.
 */
export const VariableView = z.object({
  key: VariableKey,
  value: z.string().max(MAX_VALUE_LENGTH),
  isEnabled: z.boolean(),
});
export type VariableView = z.infer<typeof VariableView>;

export const VariableList = z.array(VariableView).max(MAX_VARIABLES_PER_SCOPE);

export const OwnerInput = WorkspaceScoped.extend({ owner: VariableOwner });
export const SaveVariablesInput = OwnerInput.extend({ variables: VariableList });
export type SaveVariablesInput = z.infer<typeof SaveVariablesInput>;

export const CreateEnvironmentInput = WorkspaceScoped.extend({ name: EntityName });
export const ColorEnvironmentInput = WorkspaceScoped.extend({
  id: EntityId,
  color: z.enum(EnvironmentColors).nullable(),
});
export const ProtectEnvironmentInput = WorkspaceScoped.extend({ id: EntityId, isProtected: z.boolean() });

/**
 * A variable a request can see, nearest scope first (the one {{name}} resolves to).
 * owner null = a dynamic value such as {{$guid}} (value null: a new one on each send).
 */
export const VisibleVariable = z.object({
  key: VariableKey,
  value: z.string().max(MAX_VALUE_LENGTH).nullable(),
  owner: VariableOwner.nullable(),
});
export type VisibleVariable = z.infer<typeof VisibleVariable>;

/** Sets one variable's value (adding it when the scope does not have it yet). */
export const SetVariableValueInput = OwnerInput.extend({
  key: VariableKey,
  value: z.string().max(MAX_VALUE_LENGTH),
});
export type SetVariableValueInput = z.infer<typeof SetVariableValueInput>;

/** The variable names visible to a request, used to colour {{names}} in the editor. No values. */
export const VariableNamesInput = WorkspaceScoped.extend({
  environmentId: EntityId.nullable(),
  collectionId: EntityId.nullable(),
});
