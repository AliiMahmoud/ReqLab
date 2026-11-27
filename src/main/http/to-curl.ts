import { isDefaultHeader } from "./default-headers";
import type { PreparedRequest } from "./http-types";

/**
 * The prepared request (variables resolved, auth applied) as a cURL command.
 * Every argument is single-quoted for POSIX shells, so pasting it cannot run anything else.
 */
export function toCurl(request: PreparedRequest): string {
  // One flag and its value per line, so the command reads like a hand-written one.
  const lines = [`curl ${quote(request.url.href)}`];
  if (request.method !== "GET" || request.body !== undefined) lines.push(`-X ${quote(request.method)}`);
  lines.push(...headerLines(request));
  if (request.body !== undefined && request.body.length > 0) {
    lines.push(`--data-raw ${quote(request.body.toString("utf8"))}`);
  }
  return lines.join(" \\\n  ");
}

/**
 * ReqLab's own default (its User-Agent) is left out, as curl sends its own, and so is
 * Content-Length (curl counts it). Every header the user set is kept, e.g. Accept: application/json.
 */
function headerLines({ headers }: PreparedRequest): string[] {
  return headers
    .filter(([name, value]) => !isDefaultHeader(name, value) && name.toLowerCase() !== "content-length")
    .map(([name, value]) => `-H ${quote(`${name}: ${value}`)}`);
}

/** 'it'\''s' is how a single quote is written inside single quotes. */
function quote(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}
