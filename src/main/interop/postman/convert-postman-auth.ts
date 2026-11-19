import { JwtAlgorithms, type RequestAuth } from "@shared/models/auth";
import { asRecord, asText, readAuthSetting } from "./postman-values";

type Warn = (message: string) => void;
type Converter = (settings: unknown, warn: Warn) => RequestAuth;

/** Postman auth → ReqLab auth, kept as auth (not baked into headers), so inheritance still works. */
export function convertPostmanAuth(auth: unknown, warn: Warn): RequestAuth {
  const block = asRecord(auth);
  const type = asText(block?.["type"]);
  if (block === undefined || type === "" || type === "inherit") return { type: "inherit" };
  if (type === "noauth") return { type: "none" };
  const converter = CONVERTERS[type];
  if (converter !== undefined) return converter(block[type], warn);
  warn(`"${type}" auth is not supported yet; those requests were set to no auth`);
  return { type: "none" };
}

const CONVERTERS: Record<string, Converter> = {
  basic: (settings) => ({
    type: "basic",
    username: readAuthSetting(settings, "username"),
    password: readAuthSetting(settings, "password"),
  }),
  digest: (settings) => ({
    type: "digest",
    username: readAuthSetting(settings, "username"),
    password: readAuthSetting(settings, "password"),
  }),
  bearer: (settings) => ({ type: "bearer", token: readAuthSetting(settings, "token") }),
  apikey: (settings) => ({
    type: "apikey",
    key: readAuthSetting(settings, "key"),
    value: readAuthSetting(settings, "value"),
    addTo: readAuthSetting(settings, "in") === "query" ? "query" : "header",
  }),
  awsv4: (settings) => ({
    type: "awsv4",
    accessKey: readAuthSetting(settings, "accessKey"),
    secretKey: readAuthSetting(settings, "secretKey"),
    sessionToken: readAuthSetting(settings, "sessionToken"),
    region: readAuthSetting(settings, "region"),
    service: readAuthSetting(settings, "service"),
  }),
  jwt: convertJwt,
};

function convertJwt(settings: unknown, warn: Warn): RequestAuth {
  const algorithm = JwtAlgorithms.find((candidate) => candidate === readAuthSetting(settings, "algorithm"));
  if (algorithm === undefined) {
    warn("JWT auth with an unsupported algorithm was set to no auth (supported: HS256-512, RS256-512)");
    return { type: "none" };
  }
  const isRsa = algorithm.startsWith("RS");
  return {
    type: "jwt",
    algorithm,
    secret: readAuthSetting(settings, isRsa ? "privateKey" : "secret"),
    payload: readAuthSetting(settings, "payload") || "{}",
    headerPrefix: readAuthSetting(settings, "headerPrefix") || "Bearer",
  };
}
