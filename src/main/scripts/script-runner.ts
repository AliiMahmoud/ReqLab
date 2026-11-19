import type { VariableOwner } from "@shared/models/environment";
import type { ScriptReport } from "@shared/models/script-report";
import type { FinalResponse } from "../http/http-types";
import type { RequestContext } from "../pipeline/request-context";
import type { WorkspaceData } from "../workspaces/workspace-data";
import { collectScripts, type Phase } from "./script-chain";
import { SandboxOutput } from "./sandbox-output";
import type { NestedRunner } from "./run-nested-request";
import { runInSandbox } from "./script-sandbox";

/** The response a post-response script sees; huge bodies are cut (pm.response.text()). */
const MAX_SCRIPT_BODY_BYTES = 10 * 1024 * 1024;

const SCOPES = ["environment", "collection", "globals"] as const;

/** Runs one phase's scripts for the request in `context`; undefined when there are none. */
export async function runScriptPhase(
  data: WorkspaceData,
  context: RequestContext,
  run: { phase: Phase; runNested: NestedRunner },
): Promise<SandboxOutput | undefined> {
  const { phase } = run;
  const { workspaceId, itemId } = context.input;
  const scripts = collectScripts(data, workspaceId, { itemId, scripts: context.definition.scripts, phase });
  if (scripts.length === 0) return undefined;
  const input = JSON.stringify(buildInput(data, context, phase));
  const raw = await runInSandbox(scripts, input, async (requestId, scopesJson) => {
    saveScopeChanges(data, context, SandboxOutput.shape.scopes.parse(JSON.parse(scopesJson)));
    const response = await run.runNested(context, requestId);
    return JSON.stringify({ response, scopes: readScopes(data, context) });
  });
  const output = SandboxOutput.parse(raw);
  saveVariableChanges(data, context, output);
  return output;
}

function buildInput(data: WorkspaceData, context: RequestContext, phase: Phase): Record<string, unknown> {
  const { workspaceId, environmentId } = context.input;
  return {
    event: phase,
    requestName: requestName(data, context),
    environmentName:
      data
        .environments(workspaceId)
        .list()
        .find((entry) => entry.id === environmentId)?.name ?? "",
    scopes: readScopes(data, context),
    local: Object.fromEntries(context.localVariables ?? []),
    request: context.definition,
    response: context.response === undefined ? null : responseForScripts(context.response),
  };
}

/** Where pm.environment / pm.collectionVariables / pm.globals live (null: nothing to write to). */
function ownersOf(context: RequestContext): Record<(typeof SCOPES)[number], VariableOwner | null> {
  const { environmentId, collectionId } = context.input;
  return {
    environment: environmentId === null ? null : { scope: "environment", id: environmentId },
    collection: collectionId === null ? null : { scope: "collection", id: collectionId },
    globals: { scope: "global" },
  };
}

function saveVariableChanges(data: WorkspaceData, context: RequestContext, output: SandboxOutput): void {
  saveScopeChanges(data, context, output.scopes);
  context.localVariables = new Map(Object.entries(output.local));
}

function saveScopeChanges(
  data: WorkspaceData,
  context: RequestContext,
  scopes: SandboxOutput["scopes"],
): void {
  const owners = ownersOf(context);
  for (const scope of SCOPES) {
    const rows = scopes[scope];
    const owner = owners[scope];
    if (rows !== undefined && owner !== null)
      data.variables(context.input.workspaceId).replaceAll(owner, rows);
  }
}

/** Each scope's variables as stored now (null where there is nothing to read, e.g. no environment). */
function readScopes(data: WorkspaceData, context: RequestContext): Record<string, unknown> {
  const variables = data.variables(context.input.workspaceId);
  const owners = ownersOf(context);
  return Object.fromEntries(
    SCOPES.map((scope) => {
      const owner = owners[scope];
      return [scope, owner === null ? null : variables.list(owner)];
    }),
  );
}

function responseForScripts(response: FinalResponse): Record<string, unknown> {
  return {
    code: response.status,
    status: response.statusText,
    responseTime: Math.round(response.timings.total),
    size: response.body.length,
    headers: response.headers.map(([key, value]) => ({ key, value })),
    body: response.body.subarray(0, MAX_SCRIPT_BODY_BYTES).toString("utf8"),
  };
}

function requestName(data: WorkspaceData, context: RequestContext): string {
  const { workspaceId, itemId } = context.input;
  if (itemId === null) return "Untitled request";
  return (
    data
      .collections(workspaceId)
      .readTree()
      .items.find((item) => item.id === itemId)?.name ?? ""
  );
}

/** Adds one phase's tests, console lines and errors to the report shown with the response. */
export function addToReport(report: ScriptReport, phase: Phase, output: SandboxOutput): ScriptReport {
  return {
    tests: [...report.tests, ...output.tests].slice(0, 1_000),
    logs: [...report.logs, ...output.logs.map((line) => ({ ...line, phase }))].slice(0, 1_000),
    errors: [...report.errors, ...output.errors.map((error) => ({ ...error, phase }))].slice(0, 100),
  };
}
