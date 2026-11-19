import type { VariableOwner, VisibleVariable } from "@shared/models/environment";
import { collectionTree } from "../../stores/collection-store";
import { activeCollectionId, activeEnvironmentId, environments } from "../../stores/environment-store";

/** "Environment · Dev", "Collection · Shop", "Globals" or "Dynamic". */
export function scopeLabel(owner: VariableOwner | null): string {
  if (owner === null) return "Dynamic";
  if (owner.scope === "global") return "Globals";
  if (owner.scope === "environment") {
    return `Environment · ${environments.get().find((environment) => environment.id === owner.id)?.name ?? ""}`;
  }
  return `Collection · ${collectionTree.get().collections.find((collection) => collection.id === owner.id)?.name ?? ""}`;
}

export function valuePreview(variable: VisibleVariable): string {
  if (variable.owner === null) return "a new value on each send";
  return variable.value === "" ? "(empty)" : (variable.value ?? "");
}

/** Where a variable that nothing defines yet is added: the active environment, else the collection, else globals. */
export function defaultOwnerForNewVariable(): VariableOwner {
  const environmentId = activeEnvironmentId.get();
  if (environmentId !== null) return { scope: "environment", id: environmentId };
  const collectionId = activeCollectionId();
  return collectionId === null ? { scope: "global" } : { scope: "collection", id: collectionId };
}
