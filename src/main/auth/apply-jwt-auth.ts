import { createHmac, createSign } from "node:crypto";
import type { RequestAuth } from "@shared/models/auth";
import { RequestFailed } from "../errors";
import type { PreparedRequest } from "../http/http-types";
import { withHeaderUnlessSet } from "./auth-header";

type JwtAuth = Extract<RequestAuth, { type: "jwt" }>;

const HASH_BY_ALGORITHM: Record<JwtAuth["algorithm"], string> = {
  HS256: "sha256",
  HS384: "sha384",
  HS512: "sha512",
  RS256: "RSA-SHA256",
  RS384: "RSA-SHA384",
  RS512: "RSA-SHA512",
};

/** Builds and signs a JWT from the payload, then sends it as "<prefix> <token>". */
export function applyJwtAuth(auth: JwtAuth, request: PreparedRequest): PreparedRequest {
  const token = createJwt(auth);
  const prefix = auth.headerPrefix.trim();
  return withHeaderUnlessSet(request, "Authorization", prefix === "" ? token : `${prefix} ${token}`);
}

export function createJwt(auth: Pick<JwtAuth, "algorithm" | "secret" | "payload">): string {
  const header = base64Url(JSON.stringify({ alg: auth.algorithm, typ: "JWT" }));
  const signingInput = `${header}.${base64Url(JSON.stringify(parsePayload(auth.payload)))}`;
  return `${signingInput}.${sign(auth, signingInput)}`;
}

function parsePayload(payload: string): object {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload.trim() === "" ? "{}" : payload);
  } catch {
    throw new RequestFailed("The JWT payload is not valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new RequestFailed("The JWT payload must be a JSON object.");
  }
  return parsed;
}

function sign(auth: Pick<JwtAuth, "algorithm" | "secret">, input: string): string {
  const hash = HASH_BY_ALGORITHM[auth.algorithm];
  if (auth.algorithm.startsWith("HS")) return createHmac(hash, auth.secret).update(input).digest("base64url");
  try {
    return createSign(hash).update(input).sign(auth.secret, "base64url");
  } catch {
    throw new RequestFailed("The JWT private key is not a valid PEM key.");
  }
}

function base64Url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}
