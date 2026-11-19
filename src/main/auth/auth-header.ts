import { findHeader, type PreparedRequest } from "../http/http-types";

/** Adds a header unless the user already set it by hand: an explicit header always wins. */
export function withHeaderUnlessSet(request: PreparedRequest, name: string, value: string): PreparedRequest {
  if (findHeader(request.headers, name) !== undefined) return request;
  return { ...request, headers: [...request.headers, [name, value]] };
}
