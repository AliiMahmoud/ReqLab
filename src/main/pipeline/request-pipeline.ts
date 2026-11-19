import type { PipelineStep, RequestContext } from "./request-context";

/**
 * Runs the steps of sending a request, in order. The planned full order is:
 *   resolveVariables → runPreRequestScripts → inheritAuthenticationFromParents → applyAuthentication
 *   → attachCookies → guardProtectedEnvironment → warnIfSecretsGoOverPlainHttp → sendOverNetwork
 *   → saveReceivedCookies → runTestScripts → recordInHistory
 * Steps not built yet (scripts, protected-environment guard) are inserted when they arrive.
 */
export class RequestPipeline {
  constructor(private readonly steps: readonly PipelineStep[]) {}

  async run(context: RequestContext): Promise<void> {
    for (const step of this.steps) await step(context);
  }
}
