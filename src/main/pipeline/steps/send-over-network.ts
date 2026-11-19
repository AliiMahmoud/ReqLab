import { answerDigestChallenge, parseDigestChallenge } from "../../auth/digest-auth";
import { RequestCancelled, RequestFailed } from "../../errors";
import { describeNetworkError } from "../../http/describe-network-error";
import { sendFollowingRedirects } from "../../http/follow-redirects";
import { findHeader, type FinalResponse, type PreparedRequest } from "../../http/http-types";
import { createNetworkPlan, type NetworkPlan } from "../../network/network-plan";
import type { NetworkSettingsStore } from "../../network/network-settings-store";
import type { RequestSettingsStore } from "../../network/request-settings-store";
import type { ExchangeOptions } from "../../http/send-one-exchange";
import { requireValue, type PipelineStep, type RequestContext } from "../request-context";

/** Sends with the workspace's TLS and proxy settings; warns when certificate checks are off. */
export function sendOverNetwork(
  networkSettings: NetworkSettingsStore,
  requestSettings: RequestSettingsStore,
): PipelineStep {
  return async (context) => {
    const network = createNetworkPlan(networkSettings.read(context.input.workspaceId));
    const maxResponseBytes = requestSettings.read(context.input.workspaceId).maxResponseMb * 1024 * 1024;
    if (network.isTlsVerificationOff && context.prepared?.url.protocol === "https:") {
      context.warnings.push(
        "TLS certificate verification is off for this workspace: the server's identity was not checked.",
      );
    }
    await sendWith(context, { network, maxResponseBytes });
  };
}

async function sendWith(
  context: RequestContext,
  { network, maxResponseBytes }: { network: NetworkPlan; maxResponseBytes: number },
): Promise<void> {
  const prepared = requireValue(context.prepared, "sendOverNetwork");
  const options = { signal: context.signal, network, maxResponseBytes };
  try {
    const first = await sendFollowingRedirects(prepared, options);
    context.response = (await answerDigestOnce(context, prepared, { first, options })) ?? first;
  } catch (error) {
    if (context.signal.aborted && isUserCancel(context.signal)) throw new RequestCancelled();
    if (context.signal.aborted) throw timedOut();
    throw describeNetworkError(error);
  }
}

/** Digest auth: a 401 with a Digest challenge is answered once; any other response stands. */
async function answerDigestOnce(
  context: RequestContext,
  prepared: PreparedRequest,
  { first: response, options }: { first: FinalResponse; options: ExchangeOptions },
): Promise<FinalResponse | undefined> {
  const auth = context.resolved?.auth;
  if (auth?.type !== "digest" || !isDigestChallenge(prepared, response)) return undefined;
  const challenge = parseDigestChallenge(findHeader(response.headers, "www-authenticate") ?? "");
  const authorization =
    challenge &&
    answerDigestChallenge(challenge, {
      username: auth.username,
      password: auth.password,
      method: prepared.method,
      uri: `${prepared.url.pathname}${prepared.url.search}`,
      body: prepared.body,
    });
  if (authorization === undefined) return undefined;
  const headers: PreparedRequest["headers"] = [...prepared.headers, ["Authorization", authorization]];
  return sendFollowingRedirects({ ...prepared, headers }, options);
}

/** A 401 we may answer: the user did not set an Authorization header by hand. */
function isDigestChallenge(prepared: PreparedRequest, response: FinalResponse): boolean {
  return response.status === 401 && findHeader(prepared.headers, "authorization") === undefined;
}

/** The signal combines the user's Cancel with Settings › Request timeout; a TimeoutError means the latter. */
function isUserCancel(signal: AbortSignal): boolean {
  return !(signal.reason instanceof DOMException && signal.reason.name === "TimeoutError");
}

function timedOut(): Error {
  return new RequestFailed(
    "No response within the request timeout (Settings › General › Request; 0 = no timeout).",
  );
}
