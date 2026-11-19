import { RequestFailed } from "../errors";
import { MAX_REDIRECTS } from "./http-limits";
import { findHeader, withoutHeaders, type FinalResponse, type PreparedRequest } from "./http-types";
import { sendOneExchange, type ExchangeOptions } from "./send-one-exchange";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const CREDENTIAL_HEADERS = ["authorization", "cookie", "proxy-authorization"];
const BODY_HEADERS = ["content-type", "content-length", "content-encoding"];

/** Sends a request and follows up to 10 redirects. Credentials never follow a redirect to another origin. */
export async function sendFollowingRedirects(
  request: PreparedRequest,
  options: ExchangeOptions,
): Promise<FinalResponse> {
  let current = request;
  let totalMs = 0;
  for (let redirectCount = 0; ; redirectCount += 1) {
    const response = await sendOneExchange(current, options);
    totalMs += response.timings.total;
    const location = findHeader(response.headers, "location");
    if (!REDIRECT_STATUSES.has(response.status) || location === undefined) {
      return {
        ...response,
        timings: { ...response.timings, total: totalMs },
        url: current.url,
        redirectCount,
      };
    }
    if (redirectCount >= MAX_REDIRECTS) throw new RequestFailed("Stopped after 10 redirects.");
    current = buildRedirectedRequest(current, response.status, location);
  }
}

function buildRedirectedRequest(
  previous: PreparedRequest,
  status: number,
  location: string,
): PreparedRequest {
  const target = parseRedirectTarget(location, previous.url);
  let headers = withoutHeaders(previous.headers, ["host"]);
  if (isLeavingTrust(previous.url, target)) headers = withoutHeaders(headers, CREDENTIAL_HEADERS);
  if (!switchesToGet(previous.method, status)) return { ...previous, url: target, headers };
  return { method: "GET", url: target, headers: withoutHeaders(headers, BODY_HEADERS), body: undefined };
}

function parseRedirectTarget(location: string, base: URL): URL {
  let target: URL;
  try {
    target = new URL(location, base);
  } catch {
    throw new RequestFailed("The server redirected to an invalid address.");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new RequestFailed("The server redirected to a non-HTTP address. Not followed.");
  }
  return target;
}

/** Another origin, or a downgrade from https to http. */
function isLeavingTrust(from: URL, to: URL): boolean {
  return from.origin !== to.origin || (from.protocol === "https:" && to.protocol === "http:");
}

/** Browsers' rules: 303 always becomes GET; 301/302 turn a POST into a GET. 307/308 keep everything. */
function switchesToGet(method: string, status: number): boolean {
  if (status === 303) return method !== "HEAD";
  return (status === 301 || status === 302) && method === "POST";
}
