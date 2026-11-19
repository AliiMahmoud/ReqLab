import { RequestDefinition } from "@shared/models/request";
import type { ScriptReport } from "@shared/models/script-report";
import { RequestFailed } from "../../errors";
import type { NestedRunner } from "../../scripts/run-nested-request";
import { addToReport, runScriptPhase } from "../../scripts/script-runner";
import type { WorkspaceData } from "../../workspaces/workspace-data";
import type { PipelineStep } from "../request-context";

const EMPTY_REPORT: ScriptReport = { tests: [], logs: [], errors: [] };

/**
 * Collection, folder and request pre-request scripts, before {{variables}} are filled in (so what
 * they set is used). A failing script stops the send, as in Postman.
 */
export function runPreRequestScripts(data: WorkspaceData, runNested: NestedRunner): PipelineStep {
  return async (context) => {
    const output = await runScriptPhase(data, context, { phase: "prerequest", runNested }).catch(
      (error: unknown) => {
        throw new RequestFailed(
          `Pre-request script stopped: ${error instanceof Error ? error.message : String(error)}`,
        );
      },
    );
    if (output === undefined) return;
    context.scriptReport = addToReport(context.scriptReport ?? EMPTY_REPORT, "prerequest", output);
    const [failure] = output.errors;
    if (failure !== undefined)
      throw new RequestFailed(
        `The pre-request script of the ${failure.source} failed: ${innermost(failure.message)}`,
      );
    if (output.request === null) return;
    const changed = RequestDefinition.safeParse(output.request);
    if (changed.success) context.definition = changed.data;
    else
      context.warnings.push(
        "A pre-request script left the request in a state that cannot be sent; its changes were ignored.",
      );
  };
}

/** Post-response scripts and tests: their results are shown with the response; errors do not fail it. */
export function runPostResponseScripts(data: WorkspaceData, runNested: NestedRunner): PipelineStep {
  return async (context) => {
    try {
      const output = await runScriptPhase(data, context, { phase: "test", runNested });
      if (output !== undefined)
        context.scriptReport = addToReport(context.scriptReport ?? EMPTY_REPORT, "test", output);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const report = context.scriptReport ?? EMPTY_REPORT;
      context.scriptReport = {
        ...report,
        errors: [...report.errors, { phase: "test", source: "scripts", message }],
      };
    }
  };
}

/** A request run by a script that failed the same way says so once, not once per level. */
function innermost(message: string): string {
  return message.replace(/^(?:The pre-request script of the [^:]+ failed: )+/, "");
}
