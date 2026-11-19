import { RequestFailed } from "../errors";
import type { PreparedRequest } from "../http/http-types";
import { withHeaderUnlessSet } from "./auth-header";

export function applyApiKeyAuth(
  auth: { key: string; value: string; addTo: "header" | "query" },
  request: PreparedRequest,
): PreparedRequest {
  const key = auth.key.trim();
  if (key === "") throw new RequestFailed("API key auth needs a key name.");
  if (auth.addTo === "header") return withHeaderUnlessSet(request, key, auth.value);
  const url = new URL(request.url);
  url.searchParams.append(key, auth.value);
  return { ...request, url };
}
