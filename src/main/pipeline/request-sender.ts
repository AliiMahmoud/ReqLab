import type { ResponseView, SendRequestInput } from "@shared/models/http-exchange";
import type { NetworkLogView } from "@shared/models/network-log";
import type { RequestDefinition } from "@shared/models/request";
import type { FinalResponse, PreparedRequest } from "../http/http-types";
import { toCurl } from "../http/to-curl";
import { NetworkLog } from "../http/network-log";
import { RecentNetworkLogs } from "./recent-network-logs";
import type { OAuth2Service } from "../auth/oauth2/oauth2-service";
import type { NetworkSettingsStore } from "../network/network-settings-store";
import type { RequestSettingsStore } from "../network/request-settings-store";
import { usesSecret } from "../variables/uses-secret";
import { ReqLabError } from "../errors";
import type { VariableService } from "../variables/variable-service";
import type { WorkspaceData } from "../workspaces/workspace-data";
import type { WorkspaceService } from "../workspaces/workspace-service";
import { toResponseView } from "./response-view";
import type { RequestContext } from "./request-context";
import { RequestPipeline } from "./request-pipeline";
import { applyAuthentication } from "./steps/apply-authentication";
import { attachCookies } from "./steps/attach-cookies";
import { guardProtectedEnvironment } from "./steps/guard-protected-environment";
import { saveReceivedCookies } from "./steps/save-received-cookies";
import { inheritAuthenticationFromParents } from "./steps/inherit-authentication";
import { obtainOAuth2Token } from "./steps/obtain-oauth2-token";
import { prepareRequest } from "./steps/prepare-request";
import { recordInHistory } from "./steps/record-in-history";
import { resolveVariables } from "./steps/resolve-variables";
import { runPostResponseScripts, runPreRequestScripts } from "./steps/run-scripts";
import { createNestedRunner, type NestedRunner } from "../scripts/run-nested-request";
import { sendOverNetwork } from "./steps/send-over-network";
import { warnIfSecretsGoOverPlainHttp } from "./steps/warn-if-secrets-go-over-plain-http";

interface SenderServices {
  data: WorkspaceData;
  networkSettings: NetworkSettingsStore;
  requestSettings: RequestSettingsStore;
  oauth2: OAuth2Service;
}

/** Sends requests through the pipeline and lets the UI cancel them by id. */
export class RequestSender {
  readonly #inFlight = new Map<string, AbortController>();
  readonly #logs = new RecentNetworkLogs();
  readonly #pipeline: RequestPipeline;
  /** The same steps up to the network: what "Copy as cURL" runs. */
  readonly #preparation: RequestPipeline;
  readonly #recordInHistory: (context: RequestContext) => void;
  readonly #requestSettings: RequestSettingsStore;
  /** Scripts run saved requests through this same sender (pm.execution.runRequest). */
  readonly #runNested: NestedRunner;

  constructor(workspaces: WorkspaceService, variables: VariableService, services: SenderServices) {
    const { data, networkSettings, requestSettings, oauth2 } = services;
    this.#requestSettings = requestSettings;
    this.#runNested = createNestedRunner(data, (input, depth) => this.send(input, depth));
    this.#recordInHistory = recordInHistory(workspaces);
    const preparationSteps = [
      inheritAuthenticationFromParents(data),
      resolveVariables(variables),
      obtainOAuth2Token(oauth2),
      prepareRequest,
      applyAuthentication,
    ];
    this.#preparation = new RequestPipeline(preparationSteps);
    this.#pipeline = new RequestPipeline([
      guardProtectedEnvironment(data),
      runPreRequestScripts(data, this.#runNested),
      ...preparationSteps,
      attachCookies(data, requestSettings),
      warnIfSecretsGoOverPlainHttp,
      sendOverNetwork(networkSettings, requestSettings),
      saveReceivedCookies(data, requestSettings),
      runPostResponseScripts(data, this.#runNested),
      this.#recordInHistory,
    ]);
  }

  /**
   * The request exactly as it would be sent, as a cURL command. It may hold secret values, so it is
   * only ever written to the clipboard from main; the flag says whether it does.
   */
  async buildCurl(input: SendRequestInput): Promise<{ curl: string; containsSecrets: boolean }> {
    const context: RequestContext = {
      input,
      signal: new AbortController().signal,
      sentAt: new Date().toISOString(),
      definition: input.definition,
      warnings: [],
      log: new NetworkLog(),
    };
    await this.#preparation.run(context);
    const curl = toCurl(context.prepared as PreparedRequest);
    const masker = context.scopes?.masker;
    const containsSecrets =
      masker !== undefined &&
      (masker.containsSecret(curl) || usesSecret(context.resolved as RequestDefinition, masker));
    return { curl, containsSecrets };
  }

  /** `depth` > 0: run by a script (pm.execution.runRequest), not by the user. */
  async send(input: SendRequestInput, depth = 0): Promise<ResponseView> {
    const cancel = new AbortController();
    this.#inFlight.set(input.requestId, cancel);
    // Settings › Request › Timeout; 0 = no timeout (Cancel still works).
    const { timeoutMs } = this.#requestSettings.read(input.workspaceId);
    const signal =
      timeoutMs === 0 ? cancel.signal : AbortSignal.any([cancel.signal, AbortSignal.timeout(timeoutMs)]);
    const context: RequestContext = {
      input,
      signal,
      sentAt: new Date().toISOString(),
      definition: input.definition,
      warnings: [],
      depth,
      log: new NetworkLog(),
    };
    try {
      await this.#pipeline.run(context);
      return this.buildView(context);
    } catch (error) {
      this.recordFailure(context);
      if (error instanceof Error) context.log.fail(error.message);
      throw maskError(error, context);
    } finally {
      this.#inFlight.delete(input.requestId);
      this.rememberLog(context);
    }
  }

  cancel(requestId: string): void {
    this.#inFlight.get(requestId)?.abort();
  }

  /** The masked network log of a recent send, for the Log button; null once forgotten. */
  getLog(requestId: string): NetworkLogView | null {
    return this.#logs.get(requestId);
  }

  private rememberLog(context: RequestContext): void {
    const masker = context.scopes?.masker;
    this.#logs.remember(
      context.input.requestId,
      context.log.toView((text) => masker?.mask(text) ?? text),
    );
  }

  private buildView(context: RequestContext): ResponseView {
    const response = context.response as FinalResponse;
    return toResponseView(response, {
      mask: (text) => context.scopes?.masker.mask(text) ?? text,
      warnings: context.warnings,
      ...(context.scriptReport === undefined ? {} : { scripts: context.scriptReport }),
    });
  }

  private recordFailure(context: RequestContext): void {
    if (context.response !== undefined) return;
    try {
      this.#recordInHistory(context);
    } catch {
      // The workspace may have locked meanwhile; history is best-effort.
    }
  }
}

function maskError(error: unknown, context: RequestContext): unknown {
  if (!(error instanceof ReqLabError) || context.scopes === undefined) return error;
  const masked = context.scopes.masker.mask(error.message);
  return masked === error.message ? error : new ReqLabError(error.code, masked);
}
