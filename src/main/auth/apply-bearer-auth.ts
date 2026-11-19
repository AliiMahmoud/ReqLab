import type { PreparedRequest } from "../http/http-types";
import { withHeaderUnlessSet } from "./auth-header";

export function applyBearerAuth(auth: { token: string }, request: PreparedRequest): PreparedRequest {
  return withHeaderUnlessSet(request, "Authorization", `Bearer ${auth.token.trim()}`);
}
