import { MAX_SCRIPT_LENGTH, NO_SCRIPTS, type Scripts } from "@shared/models/scripts";
import { asArray, asRecord } from "./postman-values";

/** Postman keeps scripts as events: "prerequest" and "test" (its post-response), each a list of lines. */
export interface PostmanEvent {
  listen: "prerequest" | "test";
  script: { type: "text/javascript"; exec: string[] };
}

const LISTENERS = { prerequest: "preRequest", test: "postResponse" } as const;

/** Postman events → scripts; too-long scripts are dropped with a warning. */
export function convertPostmanEvents(events: unknown, warn: (message: string) => void): Scripts {
  const scripts: Scripts = { ...NO_SCRIPTS };
  for (const event of asArray(events)) {
    const record = asRecord(event);
    const listen = record?.["listen"];
    if (listen !== "prerequest" && listen !== "test") continue;
    const text = scriptText(asRecord(record?.["script"])?.["exec"]);
    if (text.length > MAX_SCRIPT_LENGTH) warn("A script longer than 100 000 characters was skipped");
    else scripts[LISTENERS[listen]] = text;
  }
  return scripts;
}

/** "exec" is a list of lines, or (older exports) one string. */
function scriptText(exec: unknown): string {
  const lines = typeof exec === "string" ? [exec] : asArray(exec);
  return lines.filter((line): line is string => typeof line === "string").join("\n");
}

export function hasScripts(scripts: Scripts | undefined): scripts is Scripts {
  return scripts !== undefined && (scripts.preRequest.trim() !== "" || scripts.postResponse.trim() !== "");
}

/** Scripts → Postman events (none when both are empty). */
export function toPostmanEvents(scripts: Scripts | undefined): PostmanEvent[] | undefined {
  if (!hasScripts(scripts)) return undefined;
  const events: PostmanEvent[] = [];
  if (scripts.preRequest.trim() !== "") events.push(toEvent("prerequest", scripts.preRequest));
  if (scripts.postResponse.trim() !== "") events.push(toEvent("test", scripts.postResponse));
  return events;
}

function toEvent(listen: PostmanEvent["listen"], text: string): PostmanEvent {
  return { listen, script: { type: "text/javascript", exec: text.split("\n") } };
}
