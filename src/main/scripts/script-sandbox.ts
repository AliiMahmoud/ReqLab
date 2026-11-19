import { Worker } from "node:worker_threads";
import workerPath from "./script-worker?modulePath";
import { TIME_LIMIT_MS, type RunRequest } from "./sandbox-engine";

export interface SandboxScript {
  /** Where it comes from, e.g. 'collection "Shop"'. */
  source: string;
  code: string;
}

/** The engine stops scripts at 10 s of running; this is the backstop if the worker stops answering. */
const WATCHDOG_MS = TIME_LIMIT_MS + 5_000;

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  runRequest: RunRequest;
  timer: ReturnType<typeof setTimeout> | undefined;
}

type FromWorker =
  | { kind: "done"; id: number; ok: boolean; value?: unknown; error?: string }
  | { kind: "call"; id: number; callId: number; requestId: string; scopesJson: string };

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

/**
 * Runs scripts in the QuickJS sandbox on a worker thread, so a slow or endless script never freezes
 * the app. `runRequest` answers pm.execution.runRequest. Resolves with the raw output (validated by the caller).
 */
export function runInSandbox(
  scripts: readonly SandboxScript[],
  inputJson: string,
  runRequest: RunRequest,
): Promise<unknown> {
  const id = (nextId += 1);
  return new Promise((resolve, reject) => {
    const job: Pending = { resolve, reject, runRequest, timer: undefined };
    pending.set(id, job);
    armWatchdog(job);
    startedWorker().postMessage({ kind: "run", id, scripts, inputJson });
  });
}

/** Running scripts must answer within the limit; time spent sending their requests does not count. */
function armWatchdog(job: Pending): void {
  clearTimeout(job.timer);
  job.timer = setTimeout(() => {
    restartWorker(
      new Error(`Scripts ran longer than ${String(TIME_LIMIT_MS / 1000)} seconds and were stopped.`),
    );
  }, WATCHDOG_MS);
}

function startedWorker(): Worker {
  if (worker !== undefined) return worker;
  const started = new Worker(workerPath, { resourceLimits: { maxOldGenerationSizeMb: 256 } });
  started.on("message", (message: FromWorker) => {
    if (message.kind === "call") void answerCall(started, message);
    else settle(message);
  });
  started.on("error", (error: unknown) => {
    restartWorker(error instanceof Error ? error : new Error(String(error)));
  });
  started.on("exit", () => {
    if (worker === started) restartWorker(new Error("The script sandbox stopped."));
  });
  worker = started;
  return started;
}

async function answerCall(
  target: Worker,
  call: { id: number; callId: number; requestId: string; scopesJson: string },
): Promise<void> {
  const job = pending.get(call.id);
  if (job === undefined) return;
  clearTimeout(job.timer);
  try {
    const value = await job.runRequest(call.requestId, call.scopesJson);
    target.postMessage({ kind: "reply", callId: call.callId, ok: true, value });
  } catch (error) {
    target.postMessage({
      kind: "reply",
      callId: call.callId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (pending.has(call.id)) armWatchdog(job);
  }
}

function settle(message: { id: number; ok: boolean; value?: unknown; error?: string }): void {
  const job = pending.get(message.id);
  if (job === undefined) return;
  pending.delete(message.id);
  clearTimeout(job.timer);
  if (message.ok) job.resolve(message.value);
  else job.reject(new Error(message.error ?? "The script failed."));
}

/** Fails every waiting run and drops the worker; the next run starts a fresh one. */
function restartWorker(error: Error): void {
  const stopped = worker;
  worker = undefined;
  void stopped?.terminate();
  for (const [id, job] of pending) {
    clearTimeout(job.timer);
    job.reject(error);
    pending.delete(id);
  }
}
