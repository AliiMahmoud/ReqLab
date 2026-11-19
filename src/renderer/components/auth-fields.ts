import { JwtAlgorithms, OAuth2GrantTypes } from "@shared/auth-defaults";
import type { AuthType, RequestAuth } from "@shared/models/auth";

export interface AuthField {
  name: string;
  label: string;
  kind: "text" | "password" | "multiline" | "choice";
  choices?: readonly string[];
  /** Friendlier names for choices, by value. */
  choiceLabels?: Record<string, string>;
  /** Shown only when this other field has one of these values (e.g. OAuth grant types). */
  showWhen?: { field: string; values: readonly string[] };
  placeholder?: string;
}

export const AUTH_TYPE_LABELS: [AuthType, string][] = [
  ["inherit", "Inherit from parent"],
  ["none", "No auth"],
  ["basic", "Basic"],
  ["digest", "Digest"],
  ["bearer", "Bearer token"],
  ["apikey", "API key"],
  ["awsv4", "AWS Signature v4"],
  ["jwt", "JWT bearer"],
  ["oauth2", "OAuth 2.0"],
];

const BROWSER_GRANT = { field: "grantType", values: ["authorization_code"] } as const;
const PASSWORD_GRANT = { field: "grantType", values: ["password"] } as const;

const OAUTH2_FIELDS: AuthField[] = [
  {
    name: "grantType",
    label: "Grant type",
    kind: "choice",
    choices: OAuth2GrantTypes,
    choiceLabels: {
      authorization_code: "Authorization code (with PKCE)",
      client_credentials: "Client credentials",
      password: "Password credentials",
    },
  },
  {
    name: "authUrl",
    label: "Auth URL",
    kind: "text",
    placeholder: "https://id.example.com/authorize",
    showWhen: BROWSER_GRANT,
  },
  { name: "tokenUrl", label: "Access token URL", kind: "text", placeholder: "https://id.example.com/token" },
  { name: "clientId", label: "Client ID", kind: "text" },
  {
    name: "clientSecret",
    label: "Client secret",
    kind: "password",
    placeholder: "{{clientSecret}} (optional with PKCE)",
  },
  { name: "scope", label: "Scope", kind: "text", placeholder: "read write" },
  { name: "username", label: "Username", kind: "text", showWhen: PASSWORD_GRANT },
  {
    name: "password",
    label: "Password",
    kind: "password",
    placeholder: "{{password}}",
    showWhen: PASSWORD_GRANT,
  },
];

/** The fields each auth type shows, in order. Credentials accept {{variables}}. */
export const AUTH_FIELDS: Record<AuthType, AuthField[]> = {
  inherit: [],
  none: [],
  basic: [
    { name: "username", label: "Username", kind: "text" },
    { name: "password", label: "Password", kind: "password", placeholder: "{{password}}" },
  ],
  digest: [
    { name: "username", label: "Username", kind: "text" },
    { name: "password", label: "Password", kind: "password", placeholder: "{{password}}" },
  ],
  bearer: [{ name: "token", label: "Token", kind: "password", placeholder: "{{accessToken}}" }],
  apikey: [
    { name: "key", label: "Key", kind: "text", placeholder: "X-API-Key" },
    { name: "value", label: "Value", kind: "password", placeholder: "{{apiKey}}" },
    { name: "addTo", label: "Add to", kind: "choice", choices: ["header", "query"] },
  ],
  awsv4: [
    { name: "accessKey", label: "Access key", kind: "text" },
    { name: "secretKey", label: "Secret key", kind: "password", placeholder: "{{awsSecretKey}}" },
    { name: "sessionToken", label: "Session token (optional)", kind: "password" },
    { name: "region", label: "Region", kind: "text", placeholder: "us-east-1" },
    { name: "service", label: "Service", kind: "text", placeholder: "execute-api" },
  ],
  jwt: [
    { name: "algorithm", label: "Algorithm", kind: "choice", choices: JwtAlgorithms },
    {
      name: "secret",
      label: "Secret (HS*) or PEM private key (RS*)",
      kind: "multiline",
      placeholder: "{{jwtSecret}}",
    },
    { name: "payload", label: "Payload (JSON)", kind: "multiline", placeholder: '{ "sub": "123" }' },
    { name: "headerPrefix", label: "Header prefix", kind: "text", placeholder: "Bearer" },
  ],
  oauth2: OAUTH2_FIELDS,
};

const DEFAULT_AUTH: { [T in AuthType]: () => Extract<RequestAuth, { type: T }> } = {
  inherit: () => ({ type: "inherit" }),
  none: () => ({ type: "none" }),
  basic: () => ({ type: "basic", username: "", password: "" }),
  digest: () => ({ type: "digest", username: "", password: "" }),
  bearer: () => ({ type: "bearer", token: "" }),
  apikey: () => ({ type: "apikey", key: "", value: "", addTo: "header" }),
  awsv4: () => ({ type: "awsv4", accessKey: "", secretKey: "", sessionToken: "", region: "", service: "" }),
  jwt: () => ({ type: "jwt", algorithm: "HS256", secret: "", payload: "{}", headerPrefix: "Bearer" }),
  oauth2: () => ({
    type: "oauth2",
    grantType: "authorization_code",
    authUrl: "",
    tokenUrl: "",
    clientId: "",
    clientSecret: "",
    scope: "",
    username: "",
    password: "",
  }),
};

export function createDefaultAuth(type: AuthType): RequestAuth {
  return DEFAULT_AUTH[type]();
}
