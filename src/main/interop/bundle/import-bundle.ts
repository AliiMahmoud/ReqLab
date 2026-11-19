import type { Scripts } from "@shared/models/scripts";
import type { ImportReportBuilder } from "../import-report-builder";
import type { WorkspaceWriter } from "../workspace-writer";
import type { BundleContent } from "./bundle-content";

/** Copies a decrypted, validated bundle into a new workspace, giving every part a fresh id. */
export function importBundle(
  content: BundleContent,
  writer: WorkspaceWriter,
  report: ImportReportBuilder,
): void {
  const newIds = new Map<string, string>();
  writer.saveVariables({ scope: "global" }, content.globals);
  report.count("variables", content.globals.length);
  for (const collection of content.collections) {
    const id = writer.createCollection(collection.name);
    newIds.set(collection.id, id);
    writer.saveVariables({ scope: "collection", id }, collection.variables);
    if (collection.auth !== undefined) writer.saveContainerAuth(id, collection.auth);
    saveExtras(writer, id, collection);
    report.count("collections");
    report.count("variables", collection.variables.length);
  }
  for (const item of content.items) importItem(item, { writer, report, newIds });
  for (const environment of content.environments) {
    const id = writer.createEnvironment(environment.name);
    writer.saveVariables({ scope: "environment", id }, environment.variables);
    report.count("environments");
    report.count("variables", environment.variables.length);
  }
  if (!content.includesSecrets)
    report.warn("Secret values were not included in this bundle: fill them in again");
}

interface ImportContext {
  writer: WorkspaceWriter;
  report: ImportReportBuilder;
  newIds: Map<string, string>;
}

function importItem(item: BundleContent["items"][number], { writer, report, newIds }: ImportContext): void {
  const collectionId = newIds.get(item.collectionId);
  const parentId = item.parentId === null ? null : newIds.get(item.parentId);
  if (collectionId === undefined || parentId === undefined) {
    report.warn("An item whose collection or folder is missing was skipped");
    return;
  }
  const id = writer.createItem({ collectionId, parentId, kind: item.kind, name: item.name });
  newIds.set(item.id, id);
  if (item.kind === "folder") {
    if (item.auth !== undefined) writer.saveContainerAuth(id, item.auth);
    saveExtras(writer, id, item);
    report.count("folders");
    return;
  }
  if (item.definition !== undefined) writer.saveRequest(id, item.definition);
  report.count("requests");
}

function saveExtras(
  writer: WorkspaceWriter,
  id: string,
  extras: { description?: string | undefined; scripts?: Scripts | undefined },
): void {
  if (extras.description !== undefined) writer.saveContainerDescription(id, extras.description);
  if (extras.scripts !== undefined) writer.saveContainerScripts(id, extras.scripts);
}
