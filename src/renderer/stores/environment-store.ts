import type { EnvironmentColor } from "@shared/environment-colors";
import type { Environment, VariableOwner, VariableView, VisibleVariable } from "@shared/models/environment";
import { api } from "../api";
import { callApi } from "./notice-store";
import { signal } from "./signal";

export const environments = signal<Environment[]>([]);
export const activeEnvironmentId = signal<string | null>(null);
/** Names of the variables a request can see; colours {{names}} in the editor. */
export const knownVariableNames = signal<ReadonlySet<string>>(new Set());
/** What each {{name}} of the active request resolves to, nearest scope first. */
export const visibleVariables = signal<readonly VisibleVariable[]>([]);
let lastVariableContext: { workspaceId: string; collectionId: string | null } | undefined;

export async function loadEnvironments(workspaceId: string): Promise<void> {
  const list = await callApi(api.listEnvironments({ workspaceId }));
  if (list === undefined) return;
  environments.set(list);
  if (!list.some((environment) => environment.id === activeEnvironmentId.get())) {
    activeEnvironmentId.set(null);
  }
}

export async function createEnvironment(workspaceId: string, name: string): Promise<Environment | undefined> {
  const created = await callApi(api.createEnvironment({ workspaceId, name }));
  if (created !== undefined) await loadEnvironments(workspaceId);
  return created;
}

export async function renameEnvironment(workspaceId: string, id: string, name: string): Promise<void> {
  if ((await callApi(api.renameEnvironment({ workspaceId, id, name }))) !== undefined) {
    await loadEnvironments(workspaceId);
  }
}

export async function setEnvironmentColor(
  workspaceId: string,
  id: string,
  color: EnvironmentColor | null,
): Promise<void> {
  if ((await callApi(api.setEnvironmentColor({ workspaceId, id, color }))) !== undefined) {
    await loadEnvironments(workspaceId);
  }
}

export async function setEnvironmentProtected(
  workspaceId: string,
  id: string,
  isProtected: boolean,
): Promise<void> {
  if ((await callApi(api.setEnvironmentProtected({ workspaceId, id, isProtected }))) !== undefined) {
    await loadEnvironments(workspaceId);
  }
}

export async function deleteEnvironment(workspaceId: string, id: string): Promise<void> {
  if ((await callApi(api.deleteEnvironment({ workspaceId, id }))) !== undefined) {
    await loadEnvironments(workspaceId);
  }
}

export async function duplicateEnvironment(
  workspaceId: string,
  id: string,
): Promise<Environment | undefined> {
  const copy = await callApi(api.duplicateEnvironment({ workspaceId, id }));
  if (copy !== undefined) await loadEnvironments(workspaceId);
  return copy;
}

export function loadVariables(
  workspaceId: string,
  owner: VariableOwner,
): Promise<VariableView[] | undefined> {
  return callApi(api.getVariables({ workspaceId, owner }));
}

export async function saveVariables(
  workspaceId: string,
  owner: VariableOwner,
  variables: VariableView[],
): Promise<VariableView[] | undefined> {
  const saved = await callApi(api.saveVariables({ workspaceId, owner, variables }));
  if (saved !== undefined) void refreshVisibleVariables();
  return saved;
}

export async function refreshVariableNames(workspaceId: string, collectionId: string | null): Promise<void> {
  lastVariableContext = { workspaceId, collectionId };
  const visible = await callApi(
    api.listVisibleVariables({ workspaceId, environmentId: activeEnvironmentId.get(), collectionId }),
  );
  if (visible === undefined) return;
  visibleVariables.set(visible);
  knownVariableNames.set(new Set(visible.map((variable) => variable.key)));
}

/** Re-reads the active request's variables, e.g. after one was edited. */
export async function refreshVisibleVariables(): Promise<void> {
  if (lastVariableContext !== undefined) {
    await refreshVariableNames(lastVariableContext.workspaceId, lastVariableContext.collectionId);
  }
}

/** The collection of the active request, if it is saved in one. */
export function activeCollectionId(): string | null {
  return lastVariableContext?.collectionId ?? null;
}

/** Saves one value from the {{variable}} hover card, into the scope that defines it. */
export async function setVariableValue(owner: VariableOwner, key: string, value: string): Promise<boolean> {
  const workspaceId = lastVariableContext?.workspaceId;
  if (workspaceId === undefined) return false;
  const saved = await callApi(api.setVariableValue({ workspaceId, owner, key, value }));
  if (saved === undefined) return false;
  await refreshVisibleVariables();
  return true;
}
