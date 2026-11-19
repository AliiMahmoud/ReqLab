import type { PreparedRequest } from "../http/http-types";
import { withHeaderUnlessSet } from "./auth-header";

export function applyBasicAuth(
  auth: { username: string; password: string },
  request: PreparedRequest,
): PreparedRequest {
  const credentials = Buffer.from(`${auth.username}:${auth.password}`, "utf8").toString("base64");
  return withHeaderUnlessSet(request, "Authorization", `Basic ${credentials}`);
}
