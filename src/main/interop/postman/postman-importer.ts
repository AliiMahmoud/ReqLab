import { ImportFailed } from "../../errors";
import type { StoredVariable } from "../../storage/repositories/variable-repository";
import type { LoadedFile } from "../chosen-files";
import { MAX_TREE_DEPTH } from "../import-limits";
import type { ImportReportBuilder } from "../import-report-builder";
import { parseUntrustedJson } from "../untrusted-json";
import type { WorkspaceWriter } from "../workspace-writer";
import { convertPostmanAuth } from "./convert-postman-auth";
import { convertPostmanRequest } from "./convert-postman-request";
import { convertPostmanEvents, hasScripts } from "./postman-scripts";
import { convertPostmanVariables } from "./convert-postman-variables";
import { asArray, asDescription, asName, asRecord } from "./postman-values";

interface Place {
  collectionId: string;
  parentId: string | null;
  depth: number;
}

/**
 * Postman collections (v2.0 / v2.1), environments, globals and data dumps → one new workspace.
 * Every value is read defensively; whatever cannot come across is listed in the report.
 */
export class PostmanImporter {
  readonly #globals: StoredVariable[] = [];

  constructor(
    private readonly writer: WorkspaceWriter,
    private readonly report: ImportReportBuilder,
  ) {}

  importFiles(files: LoadedFile[]): void {
    for (const file of files)
      this.importDocument(parseUntrustedJson(file.bytes.toString("utf8"), file.name), file.name);
    if (this.#globals.length > 0) this.writer.saveVariables({ scope: "global" }, this.#globals);
  }

  private importDocument(document: unknown, fileName: string): void {
    const root = asRecord(document);
    if (root === undefined)
      throw new ImportFailed(`"${fileName}" is not a collection export ReqLab can read.`);
    const importer = this.chooseImporter(root);
    if (importer === undefined) {
      this.report.warn(`"${fileName}" is not a collection, environment or globals file and was skipped`);
      return;
    }
    importer(root);
  }

  private chooseImporter(
    root: Record<string, unknown>,
  ): ((root: Record<string, unknown>) => void) | undefined {
    if (asRecord(root["info"]) !== undefined && Array.isArray(root["item"]))
      return (r) => {
        this.importCollection(r);
      };
    if (Array.isArray(root["values"]))
      return (r) => {
        this.importVariableSet(r);
      };
    if (Array.isArray(root["collections"]) || Array.isArray(root["environments"]))
      return (r) => {
        this.importDataDump(r);
      };
    return undefined;
  }

  /** Postman's "Export data" dump: collections, environments and globals in one file. */
  private importDataDump(root: Record<string, unknown>): void {
    for (const collection of asArray(root["collections"])) {
      const record = asRecord(collection);
      if (record !== undefined && Array.isArray(record["item"])) this.importCollection(record);
      else this.report.warn("A collection in the old v1 format was skipped (export it again as v2.1)");
    }
    for (const environment of asArray(root["environments"])) {
      const record = asRecord(environment);
      if (record !== undefined) this.importVariableSet(record);
    }
    this.#globals.push(...convertPostmanVariables(root["globals"], this.warn));
  }

  private importCollection(root: Record<string, unknown>): void {
    const collectionId = this.writer.createCollection(
      asName(asRecord(root["info"])?.["name"], "Imported collection"),
    );
    this.report.count("collections");
    const variables = convertPostmanVariables(root["variable"], this.warn);
    this.writer.saveVariables({ scope: "collection", id: collectionId }, variables);
    this.report.count("variables", variables.length);
    this.saveContainerAuth(collectionId, root["auth"]);
    this.saveContainerScripts(collectionId, root["event"]);
    this.writer.saveContainerDescription(
      collectionId,
      asDescription(asRecord(root["info"])?.["description"]),
    );
    this.importItems(root["item"], { collectionId, parentId: null, depth: 0 });
  }

  private importItems(items: unknown, place: Place): void {
    if (place.depth > MAX_TREE_DEPTH) {
      this.report.warn(`Folders nested deeper than ${String(MAX_TREE_DEPTH)} levels were skipped`);
      return;
    }
    for (const item of asArray(items)) {
      const record = asRecord(item);
      if (record === undefined) continue;
      if (Array.isArray(record["item"])) this.importFolder(record, place);
      else if (record["request"] !== undefined) this.importRequest(record, place);
    }
  }

  private importFolder(folder: Record<string, unknown>, place: Place): void {
    const name = asName(folder["name"], "Folder");
    const folderId = this.writer.createItem({
      collectionId: place.collectionId,
      parentId: place.parentId,
      kind: "folder",
      name,
    });
    this.report.count("folders");
    this.saveContainerAuth(folderId, folder["auth"]);
    this.saveContainerScripts(folderId, folder["event"]);
    this.writer.saveContainerDescription(folderId, asDescription(folder["description"]));
    this.importItems(folder["item"], {
      collectionId: place.collectionId,
      parentId: folderId,
      depth: place.depth + 1,
    });
  }

  private importRequest(item: Record<string, unknown>, place: Place): void {
    const definition = convertPostmanRequest(item["request"], this.warn);
    if (definition === undefined) return;
    const name = asName(item["name"], "Request");
    const itemId = this.writer.createItem({
      collectionId: place.collectionId,
      parentId: place.parentId,
      kind: "request",
      name,
    });
    const scripts = convertPostmanEvents(item["event"], this.warn);
    this.writer.saveRequest(itemId, hasScripts(scripts) ? { ...definition, scripts } : definition);
    this.report.count("requests");
  }

  /** Collections and folders keep their auth; requests inside that inherit pick it up when sent. */
  private saveContainerAuth(id: string, auth: unknown): void {
    const converted = convertPostmanAuth(auth, this.warn);
    if (converted.type !== "inherit") this.writer.saveContainerAuth(id, converted);
  }

  private saveContainerScripts(id: string, events: unknown): void {
    const scripts = convertPostmanEvents(events, this.warn);
    if (hasScripts(scripts)) this.writer.saveContainerScripts(id, scripts);
  }

  /** An environment, or the globals ("_postman_variable_scope": "globals"). */
  private importVariableSet(root: Record<string, unknown>): void {
    const variables = convertPostmanVariables(root["values"], this.warn);
    this.report.count("variables", variables.length);
    if (root["_postman_variable_scope"] === "globals") {
      this.#globals.push(...variables);
      return;
    }
    const environmentId = this.writer.createEnvironment(asName(root["name"], "Imported environment"));
    this.writer.saveVariables({ scope: "environment", id: environmentId }, variables);
    this.report.count("environments");
  }

  private readonly warn = (message: string): void => {
    this.report.warn(message);
  };
}
