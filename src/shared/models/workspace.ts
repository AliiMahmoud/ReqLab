import { z } from "zod";
import { MAX_WORKSPACE_NAME_LENGTH, MIN_MASTER_PASSWORD_LENGTH } from "../limits";

export const WorkspaceId = z.uuid();

export const WorkspaceName = z.string().trim().min(1).max(MAX_WORKSPACE_NAME_LENGTH);

export const MasterPassword = z.string().min(MIN_MASTER_PASSWORD_LENGTH).max(1024);

export const WorkspaceSummary = z.object({
  id: WorkspaceId,
  name: WorkspaceName,
  createdAt: z.iso.datetime(),
  hasMasterPassword: z.boolean(),
  isUnlocked: z.boolean(),
});
export type WorkspaceSummary = z.infer<typeof WorkspaceSummary>;

export const CreateWorkspaceInput = z.object({
  name: WorkspaceName,
  masterPassword: MasterPassword.optional(),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInput>;

export const UnlockWorkspaceInput = z.object({
  workspaceId: WorkspaceId,
  masterPassword: z.string().max(1024).optional(),
});
export type UnlockWorkspaceInput = z.infer<typeof UnlockWorkspaceInput>;

export const LockWorkspaceInput = z.object({ workspaceId: WorkspaceId });
export type LockWorkspaceInput = z.infer<typeof LockWorkspaceInput>;

export const RenameWorkspaceInput = z.object({ workspaceId: WorkspaceId, name: WorkspaceName });

/** Deleting needs the workspace unlocked AND its name typed again, so it cannot happen by accident. */
export const DeleteWorkspaceInput = z.object({
  workspaceId: WorkspaceId,
  confirmationName: z.string().max(MAX_WORKSPACE_NAME_LENGTH * 2),
});
