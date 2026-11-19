import type { RequestAuth } from "@shared/models/auth";
import type { PostmanAuth, PostmanRow } from "./postman-shapes";

const OAUTH2_GRANTS: Record<string, string> = {
  authorization_code: "authorization_code_with_pkce",
  client_credentials: "client_credentials",
  password: "password_credentials",
};

/** ReqLab auth → Postman auth (the reverse of convertPostmanAuth). "inherit" is left out, as Postman does. */
export function toPostmanAuth(auth: RequestAuth): PostmanAuth | undefined {
  switch (auth.type) {
    case "inherit":
      return undefined;
    case "none":
      return { type: "noauth" };
    case "basic":
    case "digest":
      return settings(auth.type, { username: auth.username, password: auth.password });
    case "bearer":
      return settings("bearer", { token: auth.token });
    case "apikey":
      return settings("apikey", { key: auth.key, value: auth.value, in: auth.addTo });
    default:
      return toAdvancedPostmanAuth(auth);
  }
}

function toAdvancedPostmanAuth(
  auth: Extract<RequestAuth, { type: "awsv4" | "jwt" | "oauth2" }>,
): PostmanAuth {
  if (auth.type === "awsv4") {
    const { accessKey, secretKey, sessionToken, region, service } = auth;
    return settings("awsv4", { accessKey, secretKey, sessionToken, region, service });
  }
  if (auth.type === "jwt") {
    const secretField = auth.algorithm.startsWith("RS") ? "privateKey" : "secret";
    return settings("jwt", {
      algorithm: auth.algorithm,
      [secretField]: auth.secret,
      payload: auth.payload,
      headerPrefix: auth.headerPrefix,
      addTokenTo: "header",
    });
  }
  return settings("oauth2", {
    grant_type: OAUTH2_GRANTS[auth.grantType] ?? auth.grantType,
    authUrl: auth.authUrl,
    accessTokenUrl: auth.tokenUrl,
    clientId: auth.clientId,
    clientSecret: auth.clientSecret,
    scope: auth.scope,
    username: auth.username,
    password: auth.password,
  });
}

/** Postman keeps each auth's settings as rows: { key, value, type: "string" }. */
function settings(type: string, values: Record<string, string>): PostmanAuth {
  const rows: PostmanRow[] = Object.entries(values).map(([key, value]) => ({ key, value, type: "string" }));
  return { type, [type]: rows };
}
