import { findHeader, type PreparedRequest } from "./http-types";

/** Headers ReqLab adds by itself; leaving them out keeps the command close to what the user wrote. */
const AUTOMATIC_HEADERS = new Set(["user-agent", "accept", "accept-encoding", "content-length"]);

/**
 * The prepared request (variables resolved, auth applied) as a cURL command.
 * Every argument is single-quoted for POSIX shells, so pasting it cannot run anything else.
 */
export function toCurl(request: PreparedRequest): string {
  // One flag and its value per line, so the command reads like a hand-written one.
  const lines = [`curl ${quote(request.url.href)}`];
  if (request.method !== "GET" || request.body !== undefined) lines.push(`-X ${quote(request.method)}`);
  for (const [name, value] of request.headers) {
    if (!AUTOMATIC_HEADERS.has(name.toLowerCase())) lines.push(`-H ${quote(`${name}: ${value}`)}`);
  }
  if (findHeader(request.headers, "accept-encoding") !== undefined) lines.push("--compressed");
  if (request.body !== undefined && request.body.length > 0) {
    lines.push(`--data-raw ${quote(request.body.toString("utf8"))}`);
  }
  return lines.join(" \\\n  ");
}

/** 'it'\''s' is how a single quote is written inside single quotes. */
function quote(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}
