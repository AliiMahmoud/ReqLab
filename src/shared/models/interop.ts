import { z } from "zod";
import { MAX_PASSPHRASE_LENGTH } from "../limits";
import { WorkspaceId, WorkspaceName, WorkspaceSummary } from "./workspace";

export const ImportKind = z.enum(["postman", "reqlab"]);
export type ImportKind = z.infer<typeof ImportKind>;

/**
 * Files the user picked in main's file dialog. The UI only ever sees a token and the file names:
 * it can never make main read a path of its choosing.
 */
export const ChosenImport = z.object({
  token: z.uuid(),
  kind: ImportKind,
  /** An encrypted .reqlab bundle, which needs its passphrase; plain bundles and Postman files do not. */
  isEncrypted: z.boolean(),
  fileNames: z.array(z.string().max(255)).max(50),
  suggestedName: WorkspaceName,
});
export type ChosenImport = z.infer<typeof ChosenImport>;

export const RunImportInput = z.object({
  token: z.uuid(),
  workspaceName: WorkspaceName,
  /** Only for encrypted .reqlab bundles. */
  passphrase: z.string().max(MAX_PASSPHRASE_LENGTH).optional(),
});
export type RunImportInput = z.infer<typeof RunImportInput>;

export const ImportReport = z.object({
  workspace: WorkspaceSummary,
  collections: z.number().int().nonnegative(),
  folders: z.number().int().nonnegative(),
  requests: z.number().int().nonnegative(),
  environments: z.number().int().nonnegative(),
  variables: z.number().int().nonnegative(),
  /** What could not come across, in plain words (scripts, unsupported auth, file fields…). */
  warnings: z.array(z.string().max(500)).max(200),
});
export type ImportReport = z.infer<typeof ImportReport>;

/** Postman collection files imported into an open workspace (not a new one). */
export const ImportIntoWorkspaceInput = z.object({ token: z.uuid(), workspaceId: WorkspaceId });
export type ImportIntoWorkspaceInput = z.infer<typeof ImportIntoWorkspaceInput>;

/** One collection, written as a Postman Collection v2.1 file. */
export const ExportCollectionInput = z.object({ workspaceId: WorkspaceId, collectionId: z.uuid() });
export type ExportCollectionInput = z.infer<typeof ExportCollectionInput>;

/** Several selected tree entries: one Postman collection file, or a data dump with several. */
export const ExportSelectionInput = z.object({
  workspaceId: WorkspaceId,
  ids: z.array(z.uuid()).min(1).max(1000),
});
export type ExportSelectionInput = z.infer<typeof ExportSelectionInput>;

/** Exports are not encrypted, so secret values are always left out (they arrive empty on import). */
export const ExportWorkspaceInput = z.object({
  workspaceId: WorkspaceId,
  /** Environments and their variables (secret values still left empty). */
  includeEnvironments: z.boolean().default(true),
});
export type ExportWorkspaceInput = z.infer<typeof ExportWorkspaceInput>;

/** Null when the user cancelled the save dialog. */
export const ExportResult = z.object({ fileName: z.string().max(255) }).nullable();
