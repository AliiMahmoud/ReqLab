import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ResponseView, SendRequestInput } from "@shared/models/http-exchange";
import type { RequestContext } from "../pipeline/request-context";
import type { WorkspaceData } from "../workspaces/workspace-data";

/** pm.execution.runRequest: how deep requests may run requests, and how many one run may start. */
const MAX_DEPTH = 3;
const MAX_RUNS_PER_REQUEST = 10;

export type NestedRunner = (parent: RequestContext, requestId: string) => Promise<Record<string, unknown>>;
export type Send = (input: SendRequestInput, depth: number) => Promise<ResponseView>;

/**
 * Sends a saved request of the same workspace for a script (with its own auth and scripts, in the
 * same environment) and answers with its response as JSON for the sandbox.
 */
export function createNestedRunner(data: WorkspaceData, send: Send): NestedRunner {
  return async (parent, requestId) => {
    const depth = (parent.depth ?? 0) + 1;
    if (depth > MAX_DEPTH)
      throw new Error(`Requests can run other requests at most ${String(MAX_DEPTH)} levels deep.`);
    parent.nestedRuns = (parent.nestedRuns ?? 0) + 1;
    if (parent.nestedRuns > MAX_RUNS_PER_REQUEST)
      throw new Error(`A request's scripts can run at most ${String(MAX_RUNS_PER_REQUEST)} other requests.`);
    const { workspaceId, environmentId, confirmedProtected } = parent.input;
    const item = findRequest(data, workspaceId, requestId);
    const view = await send(
      {
        workspaceId,
        requestId: randomUUID(),
        definition: data.requests(workspaceId).get(item.id),
        itemId: item.id,
        environmentId,
        collectionId: item.collectionId,
        confirmedProtected,
      },
      depth,
    );
    return forScripts(view);
  };
}

function findRequest(
  data: WorkspaceData,
  workspaceId: string,
  requestId: string,
): { id: string; collectionId: string } {
  if (!z.uuid().safeParse(requestId).success)
    throw new Error(
      `"${requestId.slice(0, 60)}" is not a request ID (copy it with the ID button next to the request's name).`,
    );
  const item = data
    .collections(workspaceId)
    .readTree()
    .items.find((candidate) => candidate.id === requestId && candidate.kind === "request");
  if (item === undefined) throw new Error("There is no request with this ID in this workspace.");
  return item;
}

function forScripts(view: ResponseView): Record<string, unknown> {
  return {
    code: view.status,
    status: view.statusText,
    responseTime: Math.round(view.timings.total),
    size: view.body.size,
    headers: view.headers,
    body: view.body.text,
  };
}
