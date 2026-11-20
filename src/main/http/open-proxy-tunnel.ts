import http from "node:http";
import type { Socket } from "node:net";
import { RequestFailed } from "../errors";
import type { ProxyRoute } from "../network/network-plan";
import { keepSocketErrorsHandled } from "./keep-socket-errors-handled";

/**
 * Asks an HTTP proxy for a CONNECT tunnel to the target, so the TLS session runs end to end
 * and the proxy only relays encrypted bytes.
 */
export function openProxyTunnel(proxy: ProxyRoute, target: URL, signal: AbortSignal): Promise<Socket> {
  const authority = `${target.hostname}:${target.port || "443"}`;
  return new Promise((resolve, reject) => {
    const request = http.request({
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
    request.on("connect", (response: http.IncomingMessage, socket: Socket) => {
      settleTunnel(response, socket, { resolve, reject });
    });
    request.on("error", reject);
    request.end();
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
  outcome.reject(new RequestFailed(`The proxy refused the connection (${String(response.statusCode)}).`));
}
