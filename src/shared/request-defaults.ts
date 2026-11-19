import type { RequestDefinition } from "./models/request";

/** Zod-free request helpers, so the UI bundle does not pull in the validation library. */
export const StandardMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

export function createEmptyRequest(): RequestDefinition {
  return {
    method: "GET",
    url: "",
    params: [],
    headers: [],
    body: { type: "none" },
    auth: { type: "inherit" },
  };
}
