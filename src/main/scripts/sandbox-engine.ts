import variant from "@jitl/quickjs-singlefile-cjs-release-sync";
import {
  newQuickJSWASMModuleFromVariant,
  type QuickJSContext,
  type QuickJSRuntime,
  type QuickJSWASMModule,
} from "quickjs-emscripten-core";
import { EXPECT_SOURCE } from "./sandbox-expect";
import { PM_API_SOURCE } from "./sandbox-pm-api";
import { PM_OBJECT_SOURCE } from "./sandbox-pm-object";
import type { SandboxScript } from "./script-sandbox";

/** Per run (all of one phase's scripts): memory, stack and running-time limits. */
const MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;
const STACK_LIMIT_BYTES = 1024 * 1024;
export const TIME_LIMIT_MS = 10_000;

/**
 * Sends a saved request for the script (pm.execution.runRequest), after saving the script's variable
 * changes so far (JSON); resolves with { response, scopes } as JSON.
 */
export type RunRequest = (requestId: string, scopesJson: string) => Promise<string>;

let engine: Promise<QuickJSWASMModule> | undefined;

/**
 * Runs scripts in QuickJS (a separate JavaScript engine compiled to WebAssembly): no Node, no
 * files, no network. Plain data goes in as JSON and comes out as JSON; the caller validates it. The
 * one way out is __runRequest(id), which asks the host to send a saved request and resolves a
 * promise with the response. Each script is an async function, run one after the other.
 * Called inside the script worker thread, never on the main process's own thread.
 */
export async function runInEngine(
  scripts: readonly SandboxScript[],
  inputJson: string,
  runRequest: RunRequest,
): Promise<unknown> {
  engine ??= newQuickJSWASMModuleFromVariant(variant);
  const runtime = (await engine).newRuntime();
  runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
  runtime.setMaxStackSize(STACK_LIMIT_BYTES);
  // Waiting for a request (pm.execution.runRequest) does not count as running time.
  const clock = { deadline: Date.now() + TIME_LIMIT_MS };
  runtime.setInterruptHandler(() => Date.now() > clock.deadline);
  const context = runtime.newContext();
  const waits = new Set<Promise<void>>();
  try {
    setString(context, "__input", inputJson);
    exposeRunRequest(context, { runtime, runRequest, waits });
    evaluate(context, PM_API_SOURCE + EXPECT_SOURCE + PM_OBJECT_SOURCE);
    for (const script of scripts) await runOne({ context, runtime, waits, clock }, script);
    return JSON.parse(evaluate(context, "JSON.stringify(__output)")) as unknown;
  } finally {
    context.dispose();
    runtime.dispose();
  }
}

interface Run {
  context: QuickJSContext;
  runtime: QuickJSRuntime;
  waits: Set<Promise<void>>;
  clock: { deadline: number };
}

/** Starts the script, then lets its promises settle, waiting for requests it runs. */
async function runOne(run: Run, script: SandboxScript): Promise<void> {
  const { context, runtime, waits, clock } = run;
  setString(context, "__code", script.code);
  setString(context, "__source", script.source);
  evaluate(context, START_SCRIPT);
  for (;;) {
    const jobs = runtime.executePendingJobs();
    if (jobs.error !== undefined) {
      const error: unknown = context.dump(jobs.error);
      jobs.error.dispose();
      throw new Error(describeSandboxError(error));
    }
    if (evaluate(context, "String(__finished)") === "true") return;
    if (waits.size === 0) {
      evaluate(
        context,
        'void __output.errors.push({ source: __source, message: "The script waited for something that never finishes." })',
      );
      return;
    }
    const startedWaiting = Date.now();
    await Promise.race(waits);
    clock.deadline += Date.now() - startedWaiting;
  }
}

/** Runs the script as an async function, so it can await pm.execution.runRequest(…). */
const START_SCRIPT = `__finished = false;
(async () => { await new (async () => {}).constructor(__code)(); })()
  .catch((error) => { __output.errors.push({ source: __source, message: String(error && error.message ? error.message : error) }); })
  .then(() => { __finished = true; });
undefined;`;

function exposeRunRequest(
  context: QuickJSContext,
  host: { runtime: QuickJSRuntime; runRequest: RunRequest; waits: Set<Promise<void>> },
): void {
  const handle = context.newFunction("__runRequest", (idHandle, scopesHandle) => {
    const deferred = context.newPromise();
    const wait = host
      .runRequest(context.getString(idHandle), context.getString(scopesHandle))
      .then(
        (json) => {
          const value = context.newString(json);
          deferred.resolve(value);
          value.dispose();
        },
        (error: unknown) => {
          const value = context.newError(error instanceof Error ? error.message : String(error));
          deferred.reject(value);
          value.dispose();
        },
      )
      .finally(() => {
        deferred.dispose();
        host.waits.delete(wait);
      });
    host.waits.add(wait);
    // The engine takes ownership of what this returns; the deferred keeps (and later frees) its own.
    return deferred.handle.dup();
  });
  context.setProp(context.global, "__runRequest", handle);
  handle.dispose();
}

function setString(context: QuickJSContext, name: string, value: string): void {
  const handle = context.newString(value);
  context.setProp(context.global, name, handle);
  handle.dispose();
}

/** Evaluates code and returns its result as text; an error (or running out of time / memory) throws. */
function evaluate(context: QuickJSContext, code: string): string {
  const result = context.evalCode(code);
  if (result.error !== undefined) {
    const error: unknown = context.dump(result.error);
    result.error.dispose();
    throw new Error(describeSandboxError(error));
  }
  const value: unknown = context.dump(result.value);
  // Reading some values (e.g. a promise) already frees them.
  if (result.value.alive) result.value.dispose();
  return typeof value === "string" ? value : "";
}

function describeSandboxError(error: unknown): string {
  const message =
    typeof error === "object" && error !== null && "message" in error ? String(error.message) : String(error);
  if (/interrupted/i.test(message))
    return `Scripts ran longer than ${String(TIME_LIMIT_MS / 1000)} seconds and were stopped.`;
  if (/out of memory/i.test(message)) return "Scripts used more than 64 MB of memory and were stopped.";
  return message;
}
