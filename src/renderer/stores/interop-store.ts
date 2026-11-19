import type { ChosenImport, ImportReport } from "@shared/models/interop";
import type { Result } from "@shared/result";
import { api } from "../api";

/** Thin wrappers: the dialogs show errors in place, so results come back whole. */
export function chooseImportFiles(): Promise<Result<ChosenImport | null>> {
  return api.chooseImportFiles();
}

export function runImport(input: {
  token: string;
  workspaceName: string;
  passphrase: string | undefined;
}): Promise<Result<ImportReport>> {
  return api.runImport(input);
}

export function exportWorkspace(input: {
  workspaceId: string;
  includeEnvironments: boolean;
}): Promise<Result<{ fileName: string } | null>> {
  return api.exportWorkspace(input);
}
