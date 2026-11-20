import http from "node:http";
import type { Socket } from "node:net";
import { RequestFailed } from "../errors";
import type { ProxyRoute } from "../network/network-plan";
import { keepSocketErrorsHandled } from "./keep-socket-errors-handled";
import type { NetworkLog } from "./network-log";

/**
 * Asks an HTTP proxy for a CONNECT tunnel to the target, so the TLS session runs end to end
 * and the proxy only relays encrypted bytes.
 */
export function openProxyTunnel(
  proxy: ProxyRoute,
  target: URL,
  { signal, log }: { signal: AbortSignal; log: NetworkLog },
): Promise<Socket> {
  const authority = `${target.hostname}:${target.port || "443"}`;
  const signIn = proxy.authorization === undefined ? "without sign-in" : "with a username and password";
  log.noteNetwork("proxy", `${proxy.url.host} (CONNECT tunnel to ${authority}, ${signIn})`);
  log.add(`Proxy: asking ${proxy.url.host} for a tunnel to ${authority}`);
  return new Promise((resolve, reject) => {
    const request = requestTunnel(proxy, authority, signal);
    request.on("socket", (socket) => {
      log.watchSocket(socket, "proxy");
    });
    request.on("connect", (response: http.IncomingMessage, socket: Socket) => {
      log.add(
        `Proxy answered: ${String(response.statusCode)} ${response.statusMessage ?? ""}${describeChallenge(response)}`,
      );
      settleTunnel(response, socket, { resolve, reject });
    });
    request.on("error", reject);
    request.end();
  });
}

function requestTunnel(proxy: ProxyRoute, authority: string, signal: AbortSignal): http.ClientRequest {
  return http.request({
    host: proxy.url.hostname,
    port: proxy.url.port || 80,
    method: "CONNECT",
    path: authority,
    headers: {
      host: authority,
      ...(proxy.authorization === undefined ? {} : { "proxy-authorization": proxy.authorization }),
    },
    agent: false,
    // Stopped only by the request's own timeout setting or Cancel (in `signal`).
    signal,
  });
}

function settleTunnel(
  response: http.IncomingMessage,
  socket: Socket,
  outcome: { resolve: (socket: Socket) => void; reject: (error: Error) => void },
): void {
  // Node has just removed its own listeners from this socket; a later reset must not crash the app.
  keepSocketErrorsHandled(socket);
  if (response.statusCode === 200) {
    outcome.resolve(socket);
    return;
  }
  socket.destroy();
  outcome.reject(new RequestFailed(refusalMessage(response)));
}

/** A 407 names the sign-in the proxy wants (Basic, or Windows sign-in: NTLM / Negotiate). */
function refusalMessage(response: http.IncomingMessage): string {
  const status = String(response.statusCode);
  if (response.statusCode !== 407) return `The proxy refused the connection (${status}).`;
  const offered = signInSchemes(response);
  const schemes = offered.length === 0 ? "" : `; it accepts ${offered.join(", ")}`;
  return `The proxy asks you to sign in (407${schemes}). Add a username and password in Settings › Network › Custom proxy.`;
}

/** The sign-in methods a 407 offers, by name only (never the challenge data). */
function describeChallenge(response: http.IncomingMessage): string {
  if (response.statusCode !== 407) return "";
  const offered = signInSchemes(response);
  return `; Proxy-Authenticate: ${offered.length === 0 ? "(none given)" : offered.join(", ")}`;
}

/** Node joins several headers with ", ": "NTLM, Negotiate" or 'Basic realm="corp"'. */
function signInSchemes(response: http.IncomingMessage): string[] {
  return (response.headers["proxy-authenticate"] ?? "")
    .split(/,\s*/)
    .map((challenge) => challenge.split(/\s/)[0] ?? "")
    .filter((scheme) => /^[A-Za-z-]{1,20}$/.test(scheme));
}
