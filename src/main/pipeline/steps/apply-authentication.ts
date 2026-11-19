import { applyAuth } from "../../auth/auth-registry";
import { requireValue, type PipelineStep } from "../request-context";

/** Runs after the body is encoded, because some auth types (AWS Signature) sign the final bytes. */
export const applyAuthentication: PipelineStep = (context) => {
  const resolved = requireValue(context.resolved, "applyAuthentication");
  const prepared = requireValue(context.prepared, "applyAuthentication");
  context.prepared = applyAuth(resolved.auth, prepared);
};
