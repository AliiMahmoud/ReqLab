import type { SecurityStatus } from "@shared/models/security-status";
import type { WorkspaceSummary } from "@shared/models/workspace";
import type { Result } from "@shared/result";
import { api } from "../api";
import { signal } from "./signal";
import { persistTabs } from "./tab-store";

export const workspaces = signal<WorkspaceSummary[]>([]);
export const securityStatus = signal<SecurityStatus | undefined>(undefined);
/** False until the first load finishes, so the welcome screen never flashes for existing users. */
export const hasLoaded = signal(false);
/** The workspace shown on the unlock card (master password, or locked after inactivity). */
export const selectedWorkspaceId = signal<string | undefined>(undefined);
export const openWorkspaceId = signal<string | undefined>(undefined);
/** True while the welcome screen is shown on purpose (new or import) although workspaces exist. */
export const isAddingWorkspace = signal(false);
export const errorMessage = signal<string | undefined>(undefined);
export const isBusy = signal(false);

export function findWorkspace(workspaceId: string | undefined): WorkspaceSummary | undefined {
  return workspaces.get().find((workspace) => workspace.id === workspaceId);
}

export async function loadWorkspaces(): Promise<void> {
  const [status, list] = await Promise.all([api.getSecurityStatus(), api.listWorkspaces()]);
  if (status.ok) securityStatus.set(status.value);
  if (list.ok) workspaces.set(list.value);
  else errorMessage.set(list.error.message);
}

/**
 * The app's entry point. No workspaces yet: the welcome screen (name or import).
 * Otherwise straight into the last workspace (or the first one).
 */
export async function startApp(): Promise<void> {
  await loadWorkspaces();
  const last = await api.getLastWorkspace();
  hasLoaded.set(true);
  const target = (last.ok ? last.value : null) ?? workspaces.get()[0];
  if (target !== undefined) await enterWorkspace(target);
}

/** Opens a workspace: directly when the keychain unlocks it, else via its unlock card. */
async function enterWorkspace(target: WorkspaceSummary): Promise<void> {
  isAddingWorkspace.set(false);
  selectedWorkspaceId.set(target.id);
  // Remembered for the next launch even when it is already unlocked (no unlock call to record it).
  void api.setLastWorkspace({ workspaceId: target.id });
  if (target.isUnlocked) openWorkspaceId.set(target.id);
  else if (!target.hasMasterPassword) await unlockWorkspace(target.id, undefined);
  else openWorkspaceId.set(undefined);
}

/** Moves to another workspace, saving the current tabs first. */
export async function switchToWorkspace(target: WorkspaceSummary): Promise<void> {
  await saveOpenTabs();
  await enterWorkspace(target);
}

export async function createWorkspace(name: string, masterPassword: string | undefined): Promise<boolean> {
  await saveOpenTabs();
  const created = await runWhileBusy(() => api.createWorkspace({ name, masterPassword }));
  if (created === undefined) return false;
  showCreatedWorkspace(created);
  return true;
}

/** A workspace that was just created or imported, already unlocked by main. */
export function showCreatedWorkspace(created: WorkspaceSummary): void {
  replaceWorkspace(created);
  isAddingWorkspace.set(false);
  selectedWorkspaceId.set(created.id);
  openWorkspaceId.set(created.id);
}

export async function unlockWorkspace(
  workspaceId: string,
  masterPassword: string | undefined,
): Promise<void> {
  const unlocked = await runWhileBusy(() => api.unlockWorkspace({ workspaceId, masterPassword }));
  if (unlocked === undefined) return;
  replaceWorkspace(unlocked);
  openWorkspaceId.set(unlocked.id);
}

export async function renameWorkspace(workspaceId: string, name: string): Promise<boolean> {
  const renamed = await runWhileBusy(() => api.renameWorkspace({ workspaceId, name }));
  if (renamed !== undefined) replaceWorkspace(renamed);
  return renamed !== undefined;
}

/** After deleting, the next workspace opens; with none left, the welcome screen. */
export async function deleteWorkspace(workspaceId: string, confirmationName: string): Promise<boolean> {
  const deleted = await runWhileBusy(() => api.deleteWorkspace({ workspaceId, confirmationName }));
  if (deleted === undefined) return false;
  openWorkspaceId.set(undefined);
  selectedWorkspaceId.set(undefined);
  workspaces.set(workspaces.get().filter((workspace) => workspace.id !== workspaceId));
  const next = workspaces.get()[0];
  if (next !== undefined) await enterWorkspace(next);
  return true;
}

/** Shows the welcome screen (new or import) on top of existing workspaces. */
export function addWorkspace(): void {
  errorMessage.set(undefined);
  isAddingWorkspace.set(true);
}

export function cancelAddingWorkspace(): void {
  isAddingWorkspace.set(false);
}

async function saveOpenTabs(): Promise<void> {
  const current = openWorkspaceId.get();
  if (current !== undefined) await persistTabs(current);
}

async function runWhileBusy<T>(call: () => Promise<Result<T>>): Promise<T | undefined> {
  isBusy.set(true);
  errorMessage.set(undefined);
  try {
    const result = await call();
    if (result.ok) return result.value;
    errorMessage.set(result.error.message);
    return undefined;
  } finally {
    isBusy.set(false);
  }
}

function replaceWorkspace(updated: WorkspaceSummary): void {
  const others = workspaces.get().filter((workspace) => workspace.id !== updated.id);
  workspaces.set([...others, updated].sort((a, b) => a.name.localeCompare(b.name)));
}
