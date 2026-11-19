import type { Scripts } from "@shared/models/scripts";
import type { RequestAuth } from "@shared/models/auth";
import type { ItemKind } from "@shared/models/collection";
import type { VariableOwner } from "@shared/models/environment";
import type { RequestDefinition } from "@shared/models/request";
import { MAX_IMPORTED_ITEMS } from "./import-limits";
import { ImportFailed } from "../errors";
import type { StoredVariable } from "../storage/repositories/variable-repository";
import type { WorkspaceData } from "../workspaces/workspace-data";

/**
 * Writes imported content into a NEW workspace, only through the normal repositories.
 * An imported file is never opened as a database.
 */
export class WorkspaceWriter {
  #itemCount = 0;

  constructor(
    private readonly data: WorkspaceData,
    private readonly workspaceId: string,
  ) {}

  createCollection(name: string): string {
    return this.data.collections(this.workspaceId).createCollection(name).id;
  }

  createItem(place: { collectionId: string; parentId: string | null; kind: ItemKind; name: string }): string {
    this.#itemCount += 1;
    if (this.#itemCount > MAX_IMPORTED_ITEMS) {
      throw new ImportFailed(`The import has more than ${String(MAX_IMPORTED_ITEMS)} folders and requests.`);
    }
    return this.data.collections(this.workspaceId).createItem(place).id;
  }

  saveRequest(itemId: string, definition: RequestDefinition): void {
    this.data.requests(this.workspaceId).save(itemId, definition);
  }

  saveContainerAuth(id: string, auth: RequestAuth): void {
    this.data.containerAuth(this.workspaceId).write(id, auth);
  }

  saveContainerScripts(id: string, scripts: Scripts): void {
    this.data.containerScripts(this.workspaceId).write(id, scripts);
  }

  saveContainerDescription(id: string, description: string): void {
    if (description !== "") this.data.containerDescriptions(this.workspaceId).write(id, description);
  }

  createEnvironment(name: string): string {
    return this.data.environments(this.workspaceId).create(name).id;
  }

  saveVariables(owner: VariableOwner, variables: StoredVariable[]): void {
    this.data.variables(this.workspaceId).replaceAll(owner, variables);
  }
}
