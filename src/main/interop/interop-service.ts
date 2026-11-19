import { writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { BrowserWindow, dialog, type SaveDialogOptions } from "electron";
import type {
  ChosenImport,
  ExportWorkspaceInput,
  ImportReport,
  RunImportInput,
  ExportCollectionInput,
  ExportSelectionInput,
  ImportIntoWorkspaceInput,
} from "@shared/models/interop";
import type { WorkspaceSummary } from "@shared/models/workspace";
import { ImportFailed } from "../errors";
import type { WorkspaceData } from "../workspaces/workspace-data";
import type { WorkspaceService } from "../workspaces/workspace-service";
import { BundleContent } from "./bundle/bundle-content";
import {
  hasMagic,
  openBundle,
  PLAIN_BUNDLE_MAGIC,
  readPlainBundle,
  writePlainBundle,
} from "./bundle/bundle-format";
import { collectWorkspace } from "./bundle/collect-workspace";
import { importBundle } from "./bundle/import-bundle";
import type { ChosenFiles, LoadedFile } from "./chosen-files";
import { ImportReportBuilder } from "./import-report-builder";
import { exportPostmanSelection } from "./postman/export/export-postman-selection";
import { exportPostmanCollection } from "./postman/export/export-postman-collection";
import { PostmanImporter } from "./postman/postman-importer";
import { parseUntrustedJson } from "./untrusted-json";
import { WorkspaceWriter } from "./workspace-writer";

/** Imports (Postman exports, .reqlab bundles) always create a NEW workspace; exports write a .reqlab bundle. */
export class InteropService {
  constructor(
    private readonly workspaces: WorkspaceService,
    private readonly data: WorkspaceData,
    private readonly chosenFiles: ChosenFiles,
  ) {}

  chooseImportFiles(): Promise<ChosenImport | null> {
    return this.chosenFiles.choose();
  }

  async runImport(input: RunImportInput): Promise<ImportReport> {
    const pending = this.chosenFiles.get(input.token);
    // Decrypt and validate before anything is created, so a wrong passphrase leaves nothing behind.
    const bundle = pending.kind === "reqlab" ? await readBundle(pending.files, input.passphrase) : undefined;
    const workspace = await this.workspaces.createWorkspace({ name: input.workspaceName });
    const report = new ImportReportBuilder();
    try {
      const writer = new WorkspaceWriter(this.data, workspace.id);
      if (bundle === undefined) new PostmanImporter(writer, report).importFiles(pending.files);
      else importBundle(bundle, writer, report);
    } catch (error) {
      this.workspaces.deleteWorkspace(workspace.id, workspace.name);
      throw error;
    }
    this.chosenFiles.forget(input.token);
    return report.build(workspace);
  }

  /** Returns null when the user cancels the save dialog. */
  async exportWorkspace(input: ExportWorkspaceInput): Promise<{ fileName: string } | null> {
    const workspace = this.findWorkspace(input.workspaceId);
    const content = collectWorkspace(this.data, workspace.id, {
      workspaceName: workspace.name,
      includeEnvironments: input.includeEnvironments,
    });
    const path = await showSaveDialog(`${safeFileName(workspace.name)}.reqlab`, {
      name: "ReqLab bundle",
      extensions: ["reqlab"],
    });
    if (path === undefined) return null;
    await writeFile(path, writePlainBundle(Buffer.from(JSON.stringify(content), "utf8")), { mode: 0o600 });
    return { fileName: basename(path) };
  }

  /** Postman files added to an open workspace: new collections next to the existing ones. */
  importIntoWorkspace(input: ImportIntoWorkspaceInput): ImportReport {
    const pending = this.chosenFiles.get(input.token);
    if (pending.kind !== "postman")
      throw new ImportFailed("Choose a collection file (.json), not a .reqlab bundle.");
    const workspace = this.findWorkspace(input.workspaceId);
    const report = new ImportReportBuilder();
    new PostmanImporter(new WorkspaceWriter(this.data, workspace.id), report).importFiles(pending.files);
    this.chosenFiles.forget(input.token);
    return report.build(workspace);
  }

  /** Returns null when the user cancels the save dialog. */
  async exportCollection(input: ExportCollectionInput): Promise<{ fileName: string } | null> {
    this.findWorkspace(input.workspaceId);
    const document = exportPostmanCollection(this.data, input.workspaceId, input.collectionId);
    const fileName = `${safeFileName(document.info.name)}.collection.json`;
    const path = await showSaveDialog(fileName, { name: "Collection (JSON)", extensions: ["json"] });
    if (path === undefined) return null;
    // Postman writes its exports indented with tabs.
    await writeFile(path, JSON.stringify(document, null, "\t"), { mode: 0o600 });
    return { fileName: basename(path) };
  }

  /** The tree's multi-selection: one collection file, or a Postman data dump holding several. */
  async exportSelection(input: ExportSelectionInput): Promise<{ fileName: string } | null> {
    this.findWorkspace(input.workspaceId);
    const collections = exportPostmanSelection(this.data, input.workspaceId, input.ids);
    const [only] = collections;
    if (only === undefined) throw new ImportFailed("Nothing selected to export.");
    const isOne = collections.length === 1;
    const document = isOne ? only : { version: 1, collections };
    const name = isOne
      ? `${safeFileName(only.info.name)}.collection.json`
      : `${String(collections.length)} collections.json`;
    const path = await showSaveDialog(name, { name: "Collections (JSON)", extensions: ["json"] });
    if (path === undefined) return null;
    await writeFile(path, JSON.stringify(document, null, "\t"), { mode: 0o600 });
    return { fileName: basename(path) };
  }

  private findWorkspace(workspaceId: string): WorkspaceSummary {
    this.workspaces.requireUnlockedDatabase(workspaceId);
    const workspace = this.workspaces.listWorkspaces().find((summary) => summary.id === workspaceId);
    if (workspace === undefined) throw new ImportFailed("This workspace no longer exists.");
    return workspace;
  }
}

async function readBundle(files: LoadedFile[], passphrase: string | undefined): Promise<BundleContent> {
  const [file] = files;
  if (file === undefined) throw new ImportFailed("No bundle was chosen.");
  const json = await openAnyBundle(file.bytes, passphrase);
  const parsed = BundleContent.safeParse(parseUntrustedJson(json.toString("utf8"), file.name));
  if (!parsed.success) throw new ImportFailed("The bundle's contents are not valid.");
  return parsed.data;
}

/** Plain bundles open as they are; encrypted ones (older exports) need their passphrase. */
async function openAnyBundle(bytes: Buffer, passphrase: string | undefined): Promise<Buffer> {
  if (hasMagic(bytes, PLAIN_BUNDLE_MAGIC)) return readPlainBundle(bytes);
  if (passphrase === undefined || passphrase === "") throw new ImportFailed("Enter the bundle's passphrase.");
  return openBundle(bytes, passphrase);
}

/** A name usable as a file name on every platform. */
function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

async function showSaveDialog(
  defaultName: string,
  filter: { name: string; extensions: string[] },
): Promise<string | undefined> {
  const options: SaveDialogOptions = { title: "Export", defaultPath: defaultName, filters: [filter] };
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const result =
    window === undefined
      ? await dialog.showSaveDialog(options)
      : await dialog.showSaveDialog(window, options);
  return result.canceled ? undefined : result.filePath;
}
