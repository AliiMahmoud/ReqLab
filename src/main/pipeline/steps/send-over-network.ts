import { answerDigestChallenge, parseDigestChallenge } from "../../auth/digest-auth";
import { RequestCancelled, RequestFailed } from "../../errors";
import { describeNetworkError } from "../../http/describe-network-error";
import { sendFollowingRedirects, type RedirectOptions } from "../../http/follow-redirects";
import { findHeader, type FinalResponse, type PreparedRequest } from "../../http/http-types";
import { createNetworkPlan, type NetworkPlan } from "../../network/network-plan";
import type { NetworkSettingsStore } from "../../network/network-settings-store";
import type { RequestSettingsStore } from "../../network/request-settings-store";
import { requireValue, type PipelineStep, type RequestContext } from "../request-context";

/** Sends with the workspace's TLS and proxy settings (the URL bar shows "TLS off" when checks are off). */
export function sendOverNetwork(
  networkSettings: NetworkSettingsStore,
  requestSettings: RequestSettingsStore,
): PipelineStep {
  return async (context) => {
    const network = createNetworkPlan(networkSettings.read(context.input.workspaceId));
    const { maxResponseMb, followRedirects } = requestSettings.read(context.input.workspaceId);
    await sendWith(context, { network, maxResponseBytes: maxResponseMb * 1024 * 1024, followRedirects });
  };
}

async function sendWith(
  context: RequestContext,
  settings: { network: NetworkPlan; maxResponseBytes: number; followRedirects: boolean },
): Promise<void> {
  const prepared = requireValue(context.prepared, "sendOverNetwork");
  const options: RedirectOptions = { signal: context.signal, ...settings, log: context.log };
  try {
    const first = await sendFollowingRedirects(prepared, options);
    context.response = (await answerDigestOnce(context, prepared, { first, options })) ?? first;
  } catch (error) {
    if (context.signal.aborted && isUserCancel(context.signal)) {
      context.log.fail("Cancelled by the user.");
      throw new RequestCancelled();
    }
    const failure = context.signal.aborted ? timedOut() : describeNetworkError(error);
    context.log.fail(failure.message, describeCause(error));
    throw await withRoute(failure, settings.network, prepared.url);
  }
}

/** Says which way a failed request went, so a proxy problem shows: "… (through proxy x:8080)". */
async function withRoute(failure: Error, network: NetworkPlan, url: URL): Promise<Error> {
  if (!(failure instanceof RequestFailed)) return failure;
  const route = await network.proxyFor(url).then(
    (proxy) => (proxy === undefined ? "sent directly, no proxy" : `through proxy ${proxy.url.host}`),
    () => undefined,
  );
  return route === undefined ? failure : new RequestFailed(`${failure.message} (${route})`);
}

/** Digest auth: a 401 with a Digest challenge is answered once; any other response stands. */
async function answerDigestOnce(
  context: RequestContext,
  prepared: PreparedRequest,
  { first: response, options }: { first: FinalResponse; options: RedirectOptions },
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

function timedOut(): RequestFailed {
  return new RequestFailed(
    "No response within the request timeout (Settings › General › Request; 0 = no timeout).",
  );
}

/** Node's own error code and text (e.g. "ETIMEDOUT: connect ETIMEDOUT 10.0.0.1:8080"), for the log. */
function describeCause(error: unknown): string | undefined {
  if (!(error instanceof Error) || error instanceof RequestFailed) return undefined;
  const code = (error as NodeJS.ErrnoException).code;
  return `${code ?? error.name}: ${error.message}`;
}
