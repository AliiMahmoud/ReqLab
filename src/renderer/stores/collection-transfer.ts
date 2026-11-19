import { api } from "../api";
import { loadCollectionTree } from "./collection-store";
import { callApi, showNotice } from "./notice-store";

/** "Import collection…": Postman collection files become new collections in this workspace. */
export async function importCollections(workspaceId: string): Promise<void> {
  const chosen = await callApi(api.chooseImportFiles());
  if (chosen === undefined || chosen === null) return;
  const report = await callApi(api.importIntoWorkspace({ token: chosen.token, workspaceId }));
  if (report === undefined) return;
  await loadCollectionTree(workspaceId);
  const summary = `Imported ${String(report.collections)} collection(s), ${String(report.requests)} request(s).`;
  const notes = report.warnings.length === 0 ? "" : ` Not imported: ${report.warnings.join("; ")}.`;
  showNotice(summary + notes, report.warnings.length > 0);
}

/** "Export…" on a multi-selection: one collection file, or one file with several collections. */
export async function exportSelection(workspaceId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const result = await callApi(api.exportSelection({ workspaceId, ids }));
  if (result !== undefined && result !== null) showNotice(`Exported to ${result.fileName}.`, false);
}

/** "Export…" on a collection: a Postman Collection v2.1 .json file. */
export async function exportCollection(workspaceId: string, collectionId: string): Promise<void> {
  const result = await callApi(api.exportCollection({ workspaceId, collectionId }));
  if (result !== undefined && result !== null) showNotice(`Exported to ${result.fileName}.`, false);
}
