import { MAX_NAME_LENGTH } from "@shared/limits";
import type { Environment, VariableOwner, VariableView, VisibleVariable } from "@shared/models/environment";
import { EnvironmentNotFound } from "../errors";
import { EnvironmentRepository } from "../storage/repositories/environment-repository";
import { VariableRepository, type StoredVariable } from "../storage/repositories/variable-repository";
import type { WorkspaceService } from "../workspaces/workspace-service";
import { listDynamicVariableNames } from "./dynamic-variables";
import { SecretMasker } from "./secret-masker";
import { VariableResolver } from "./variable-resolver";

export interface VariableContext {
  environmentId: string | null;
  collectionId: string | null;
}

export interface ResolvedScopes {
  resolver: VariableResolver;
  masker: SecretMasker;
}

/** Reads and writes variables. Secret values are resolved here and never sent to the UI. */
export class VariableService {
  constructor(private readonly workspaces: WorkspaceService) {}

  getVariables(workspaceId: string, owner: VariableOwner): VariableView[] {
    return this.repository(workspaceId).list(owner).map(toView);
  }

  saveVariables(workspaceId: string, owner: VariableOwner, views: readonly VariableView[]): VariableView[] {
    this.assertOwnerExists(workspaceId, owner);
    this.repository(workspaceId).replaceAll(owner, views);
    return views.map(toView);
  }

  /** Copies an environment with all its variables. */
  duplicateEnvironment(workspaceId: string, environmentId: string): Environment {
    const environments = new EnvironmentRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
    const original = environments.list().find((environment) => environment.id === environmentId);
    if (original === undefined) throw new EnvironmentNotFound();
    const copy = environments.create(`${original.name} copy`.slice(0, MAX_NAME_LENGTH));
    if (original.isProtected) environments.setProtected(copy.id, true);
    if (original.color !== null) environments.setColor(copy.id, original.color);
    const repository = this.repository(workspaceId);
    repository.replaceAll(
      { scope: "environment", id: copy.id },
      repository.list({ scope: "environment", id: environmentId }),
    );
    return { ...copy, isProtected: original.isProtected, color: original.color };
  }

  /** What each {{name}} resolves to, nearest scope first. */
  listVisible(workspaceId: string, context: VariableContext): VisibleVariable[] {
    const repository = this.repository(workspaceId);
    const all = ownersFor(context).flatMap((owner) =>
      repository
        .list(owner)
        .filter((variable) => variable.isEnabled)
        .map((variable) => ({
          key: variable.key,
          value: variable.value,
          owner,
        })),
    );
    // The first of each name wins, as in resolution.
    const nearest = all.filter(
      (variable, index) => all.findIndex((other) => other.key === variable.key) === index,
    );
    const dynamic = listDynamicVariableNames().map((key) => ({
      key,
      value: null,
      owner: null,
    }));
    return [...nearest, ...dynamic];
  }

  /** Edits one value in place (from the {{variable}} hover card); a missing name is added. */
  setValue(workspaceId: string, owner: VariableOwner, change: { key: string; value: string }): void {
    this.assertOwnerExists(workspaceId, owner);
    const repository = this.repository(workspaceId);
    const variables = repository.list(owner);
    const existing = variables.find((variable) => variable.key === change.key);
    if (existing === undefined) variables.push({ ...change, isEnabled: true });
    else existing.value = change.value;
    repository.replaceAll(owner, variables);
  }

  /** Nearest first: environment, then collection, then globals. */
  /** `local`: values a script set with pm.variables.set, nearer than every scope. */
  resolveScopes(
    workspaceId: string,
    context: VariableContext,
    local?: ReadonlyMap<string, string>,
  ): ResolvedScopes {
    const owners = this.loadOwners(workspaceId, context);
    const scopes = [
      ...(local === undefined ? [] : [local]),
      ...owners.map((variables) => new Map(variables.map((v) => [v.key, v.value]))),
    ];
    // No variable is secret now; the masker only hides values fetched while sending (OAuth tokens).
    return { resolver: new VariableResolver(scopes), masker: new SecretMasker([]) };
  }

  private loadOwners(workspaceId: string, context: VariableContext): StoredVariable[][] {
    const repository = this.repository(workspaceId);
    return ownersFor(context).map((owner) => repository.list(owner).filter((variable) => variable.isEnabled));
  }

  private assertOwnerExists(workspaceId: string, owner: VariableOwner): void {
    if (owner.scope !== "environment") return;
    new EnvironmentRepository(this.workspaces.requireUnlockedDatabase(workspaceId)).assertExists(owner.id);
  }

  private repository(workspaceId: string): VariableRepository {
    return new VariableRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }
}

/** Nearest first: environment, then collection, then globals. */
function ownersFor(context: VariableContext): VariableOwner[] {
  const owners: VariableOwner[] = [];
  if (context.environmentId !== null) owners.push({ scope: "environment", id: context.environmentId });
  if (context.collectionId !== null) owners.push({ scope: "collection", id: context.collectionId });
  owners.push({ scope: "global" });
  return owners;
}

function toView(variable: StoredVariable): VariableView {
  return { key: variable.key, value: variable.value, isEnabled: variable.isEnabled };
}
