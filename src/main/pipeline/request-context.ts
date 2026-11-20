import type { SendRequestInput } from "@shared/models/http-exchange";
import type { RequestDefinition } from "@shared/models/request";
import type { ScriptReport } from "@shared/models/script-report";
import type { FinalResponse, PreparedRequest } from "../http/http-types";
import type { NetworkLog } from "../http/network-log";
import type { ResolvedScopes } from "../variables/variable-service";

/** What travels through the pipeline. Each step reads what earlier steps filled in. */
export interface RequestContext {
  readonly input: SendRequestInput;
  readonly signal: AbortSignal;
  readonly sentAt: string;
  /** The request as it goes through the steps (e.g. with inherited auth filled in), before variables. */
  definition: RequestDefinition;
  /** Shown with the response, e.g. a secret sent over plain http. */
  readonly warnings: string[];
  scopes?: ResolvedScopes;
  /** The definition after variable resolution. Holds secrets: never leaves main. */
  resolved?: RequestDefinition;
  prepared?: PreparedRequest;
  response?: FinalResponse;
  /** pm.variables.set values: this send only, nearest of all scopes. */
  localVariables?: Map<string, string>;
  /** 0 for a request the user sent; 1+ for one a script ran (pm.execution.runRequest). */
  depth?: number;
  /** How many requests this request's scripts have run so far. */
  nestedRuns?: number;
  /** Tests, console output and errors of the scripts that ran. */
  scriptReport?: ScriptReport;
  /** The network steps of this send, for the Log button (masked before it leaves main). */
  readonly log: NetworkLog;
}

export type PipelineStep = (context: RequestContext) => void | Promise<void>;

export function requireValue<T>(value: T | undefined, stepName: string): T {
  if (value === undefined) throw new Error(`Pipeline step "${stepName}" ran before its input was ready.`);
  return value;
}
