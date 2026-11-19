import { parentPort } from "node:worker_threads";
import { runInEngine } from "./sandbox-engine";
import type { SandboxScript } from "./script-sandbox";

type FromHost =
  | { kind: "run"; id: number; scripts: SandboxScript[]; inputJson: string }
  | { kind: "reply"; callId: number; ok: boolean; value?: string; error?: string };

let nextCallId = 0;
const calls = new Map<number, { resolve: (json: string) => void; reject: (error: Error) => void }>();

/** The script worker thread: runs one phase's scripts at a time; asks the host to send requests. */
parentPort?.on("message", (message: FromHost) => {
  if (message.kind === "reply") {
    answerCall(message);
    return;
  }
  runInEngine(message.scripts, message.inputJson, (requestId, scopesJson) =>
    askHost(message.id, { requestId, scopesJson }),
  )
    .then((value) => parentPort?.postMessage({ kind: "done", id: message.id, ok: true, value }))
    .catch((error: unknown) => {
      return parentPort?.postMessage({
        kind: "done",
        id: message.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });
});

/** pm.execution.runRequest: the host (main thread) sends the request and replies with its response. */
function askHost(runId: number, call: { requestId: string; scopesJson: string }): Promise<string> {
  const callId = (nextCallId += 1);
  return new Promise((resolve, reject) => {
    calls.set(callId, { resolve, reject });
    parentPort?.postMessage({ kind: "call", id: runId, callId, ...call });
  });
}

function answerCall(reply: { callId: number; ok: boolean; value?: string; error?: string }): void {
  const call = calls.get(reply.callId);
  if (call === undefined) return;
  calls.delete(reply.callId);
  if (reply.ok) call.resolve(reply.value ?? "{}");
  else call.reject(new Error(reply.error ?? "The request failed."));
}
