/** What a cURL command says, before it becomes a ReqLab request. */
export interface CurlCommand {
  url: string;
  method: string | undefined;
  headers: [string, string][];
  /** -d / --data… values, in order (curl joins them with "&"). */
  data: string[];
  /** -F name=value fields. */
  form: [string, string][];
  user: string | undefined;
  authScheme: "basic" | "digest";
  bearerToken: string | undefined;
  /** -G: the data goes into the query string. */
  isGet: boolean;
  isHead: boolean;
  warnings: string[];
}

export function emptyCommand(): CurlCommand {
  return {
    url: "",
    method: undefined,
    headers: [],
    data: [],
    form: [],
    user: undefined,
    authScheme: "basic",
    bearerToken: undefined,
    isGet: false,
    isHead: false,
    warnings: [],
  };
}

type ValueOption = (command: CurlCommand, value: string) => void;
type FlagOption = (command: CurlCommand) => void;

const addData =
  (literal: boolean): ValueOption =>
  (command, value) => {
    if (!literal && value.startsWith("@")) command.warnings.push(`The data file ${value} was not read.`);
    else command.data.push(value);
  };

const addFormField =
  (literal: boolean): ValueOption =>
  (command, value) => {
    const [name = "", ...rest] = value.split("=");
    const fieldValue = rest.join("=");
    if (!literal && /^[@<]/.test(fieldValue))
      command.warnings.push(`The form file field "${name}" was not imported.`);
    else command.form.push([name, fieldValue]);
  };

const addHeader =
  (name: string): ValueOption =>
  (command, value) =>
    command.headers.push([name, value]);

/** Options that take a value, by long name. Unlisted ones that take a value are in IGNORED_WITH_VALUE. */
export const VALUE_OPTIONS: Record<string, ValueOption> = {
  request: (command, value) => (command.method = value.toUpperCase()),
  header: (command, value) => {
    const header = parseHeader(value);
    if (header !== undefined) command.headers.push(header);
  },
  data: addData(false),
  "data-ascii": addData(false),
  "data-binary": addData(false),
  "data-raw": addData(true),
  "data-urlencode": (command, value) => command.data.push(urlEncodeData(value)),
  json: (command, value) => {
    addData(false)(command, value);
    command.headers.push(["Content-Type", "application/json"], ["Accept", "application/json"]);
  },
  form: addFormField(false),
  "form-string": addFormField(true),
  user: (command, value) => (command.user = value),
  cookie: (command, value) => {
    if (value.includes("=")) command.headers.push(["Cookie", value]);
    else command.warnings.push(`The cookie file ${value} was not read.`);
  },
  "user-agent": addHeader("User-Agent"),
  referer: addHeader("Referer"),
  url: (command, value) => (command.url = value),
  "oauth2-bearer": (command, value) => (command.bearerToken = value),
  "upload-file": (command, value) => command.warnings.push(`The upload file ${value} was not read.`),
};

export const FLAG_OPTIONS: Record<string, FlagOption> = {
  get: (command) => (command.isGet = true),
  head: (command) => (command.isHead = true),
  digest: (command) => (command.authScheme = "digest"),
  basic: (command) => (command.authScheme = "basic"),
};

/** Value options with no meaning for ReqLab (output, timeouts, TLS files…): their value is skipped. */
export const IGNORED_WITH_VALUE = new Set([
  "output",
  "max-time",
  "connect-timeout",
  "proxy",
  "proxy-user",
  "cert",
  "key",
  "cacert",
  "capath",
  "cookie-jar",
  "retry",
  "retry-delay",
  "write-out",
  "resolve",
  "limit-rate",
  "range",
  "config",
  "max-redirs",
  "interface",
  "dns-servers",
  "aws-sigv4",
  "pass",
  "cert-type",
  "key-type",
  "ciphers",
  "trace",
  "trace-ascii",
  "stderr",
  "dump-header",
  "unix-socket",
  "connect-to",
  "proto",
  "user-agent-file",
]);

export const SHORT_OPTIONS: Record<string, string> = {
  X: "request",
  H: "header",
  d: "data",
  F: "form",
  u: "user",
  b: "cookie",
  A: "user-agent",
  e: "referer",
  G: "get",
  I: "head",
  T: "upload-file",
  o: "output",
  m: "max-time",
  x: "proxy",
  U: "proxy-user",
  E: "cert",
  r: "range",
  w: "write-out",
  c: "cookie-jar",
  K: "config",
  D: "dump-header",
};

/** "Name: value"; "Name;" is an empty header; "Name:" (removing a header) is skipped. */
function parseHeader(text: string): [string, string] | undefined {
  if (/^[^:;]+;$/.test(text.trim())) return [text.trim().slice(0, -1), ""];
  const colon = text.indexOf(":");
  if (colon <= 0) return undefined;
  const value = text.slice(colon + 1).trim();
  return value === "" ? undefined : [text.slice(0, colon).trim(), value];
}

/** --data-urlencode forms: "content", "=content", "name=content" (curl encodes the content part). */
function urlEncodeData(value: string): string {
  const equals = value.indexOf("=");
  if (equals < 0) return encodeURIComponent(value);
  const name = value.slice(0, equals);
  const content = encodeURIComponent(value.slice(equals + 1));
  return name === "" ? content : `${name}=${content}`;
}
