import { ProtectedEnvironmentConfirmationRequired } from "../../errors";
import type { WorkspaceData } from "../../workspaces/workspace-data";
import type { PipelineStep } from "../request-context";

/** Reading is always fine; anything that may change data needs a confirmation. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * With a protected environment active, a request that may change data is refused until the user
 * confirms it (the UI asks, then sends again with confirmedProtected). Runs before anything else.
 */
export function guardProtectedEnvironment(data: WorkspaceData): PipelineStep {
  return (context) => {
    const { workspaceId, environmentId, confirmedProtected, definition } = context.input;
    if (environmentId === null || confirmedProtected || SAFE_METHODS.has(definition.method.toUpperCase()))
      return;
    const environment = data.environments(workspaceId).find(environmentId);
    if (environment?.isProtected === true)
      throw new ProtectedEnvironmentConfirmationRequired(environment.name);
  };
}
