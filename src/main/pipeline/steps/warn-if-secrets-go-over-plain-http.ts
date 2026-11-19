import { usesSecret } from "../../variables/uses-secret";
import { requireValue, type PipelineStep } from "../request-context";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * A secret variable's value leaving the computer unencrypted is worth telling the user about.
 * Checked on the resolved request (before encoding), so secrets inside Basic auth, AWS signing
 * or a JWT secret count too, not only ones that appear verbatim on the wire.
 */
export const warnIfSecretsGoOverPlainHttp: PipelineStep = (context) => {
  const prepared = requireValue(context.prepared, "warnIfSecretsGoOverPlainHttp");
  const resolved = requireValue(context.resolved, "warnIfSecretsGoOverPlainHttp");
  const masker = requireValue(context.scopes, "warnIfSecretsGoOverPlainHttp").masker;
  const { protocol, hostname } = prepared.url;
  if (protocol !== "http:" || LOOPBACK_HOSTS.has(hostname) || hostname.endsWith(".localhost")) return;
  if (usesSecret(resolved, masker)) {
    context.warnings.push(
      `A secret variable was sent unencrypted over http:// to ${hostname}. Use https:// for real credentials.`,
    );
  }
};
