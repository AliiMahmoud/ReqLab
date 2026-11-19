import type { AuthType, RequestAuth } from "@shared/models/auth";
import type { PreparedRequest } from "../http/http-types";
import { applyApiKeyAuth } from "./apply-api-key-auth";
import { applyAwsV4Auth } from "./apply-aws-v4-auth";
import { applyBasicAuth } from "./apply-basic-auth";
import { applyBearerAuth } from "./apply-bearer-auth";
import { applyJwtAuth } from "./apply-jwt-auth";

type AuthApplier<T extends AuthType> = (
  auth: Extract<RequestAuth, { type: T }>,
  request: PreparedRequest,
) => PreparedRequest;

const unchanged = (_auth: unknown, request: PreparedRequest): PreparedRequest => request;

/** One line per auth type. A new type = one file + one line here. */
const authAppliers: { [T in AuthType]: AuthApplier<T> } = {
  inherit: unchanged,
  none: unchanged,
  basic: applyBasicAuth,
  // Digest needs the server's challenge first: the network step answers it (see answer-digest-challenge).
  digest: unchanged,
  bearer: applyBearerAuth,
  apikey: applyApiKeyAuth,
  awsv4: applyAwsV4Auth,
  jwt: applyJwtAuth,
  // The obtainOAuth2Token step has already turned OAuth 2.0 into a Bearer token by now.
  oauth2: unchanged,
};

export function applyAuth(auth: RequestAuth, request: PreparedRequest): PreparedRequest {
  const applier = authAppliers[auth.type] as AuthApplier<typeof auth.type>;
  return applier(auth, request);
}
