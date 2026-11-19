import { RequestFailed, ReqLabError } from "../errors";

const MESSAGES_BY_CODE: Record<string, string> = {
  ENOTFOUND: "Could not resolve the host name.",
  EAI_AGAIN: "Could not resolve the host name (DNS is not answering).",
  ECONNREFUSED: "The server refused the connection.",
  ECONNRESET: "The connection was reset by the server.",
  EHOSTUNREACH: "The host is unreachable.",
  ENETUNREACH: "The network is unreachable.",
  ETIMEDOUT: "The connection timed out.",
  EPIPE: "The server closed the connection while the request was being sent.",
  ERR_INVALID_HTTP_TOKEN: "A header name contains characters that are not allowed.",
  ERR_INVALID_CHAR: "A header value contains characters that are not allowed.",
  ERR_UNESCAPED_CHARACTERS: "The URL path contains characters that are not allowed.",
  CERT_HAS_EXPIRED: "The server's TLS certificate has expired.",
  DEPTH_ZERO_SELF_SIGNED_CERT: "The server uses a self-signed TLS certificate.",
  SELF_SIGNED_CERT_IN_CHAIN: "The server's TLS certificate chain contains a self-signed certificate.",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:
    "The server's TLS certificate could not be verified. For a private CA, add it in Workspace › Network settings.",
  ERR_TLS_CERT_ALTNAME_INVALID: "The server's TLS certificate does not match the host name.",
  ERR_SSL_TLSV1_ALERT_CERTIFICATE_REQUIRED:
    "The server requires a client certificate (mTLS). Add one in Workspace › Network settings.",
  ERR_SSL_SSLV3_ALERT_BAD_CERTIFICATE: "The server did not accept the client certificate.",
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY:
    "The server's certificate is issued by an unknown CA. Add the CA in Workspace › Network settings.",
};

/** Turns a Node network error into a safe, readable message. Never includes stack traces. */
export function describeNetworkError(error: unknown): ReqLabError {
  if (error instanceof ReqLabError) return error;
  const code = readErrorCode(error);
  const message = code === undefined ? undefined : MESSAGES_BY_CODE[code];
  if (message !== undefined) return new RequestFailed(`${message} (${code ?? ""})`);
  return new RequestFailed(code === undefined ? "The request failed." : `The request failed (${code}).`);
}

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}
