import type { WorkspaceData } from "../../workspaces/workspace-data";
import type { PipelineStep } from "../request-context";

/** "Inherit" becomes the nearest folder's or collection's auth. A draft has no parents, so no auth. */
export function inheritAuthenticationFromParents(data: WorkspaceData): PipelineStep {
  return (context) => {
    if (context.definition.auth.type !== "inherit") return;
    const { workspaceId, itemId } = context.input;
    const auth =
      itemId === null ? { type: "none" as const } : data.containerAuth(workspaceId).resolveInherited(itemId);
    context.definition = { ...context.definition, auth };
  };
}
