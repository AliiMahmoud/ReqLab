import type { Socket } from "node:net";

/**
 * Gives a socket an error listener that lasts for its whole life.
 *
 * Node removes its own listeners when it hands a socket over (a CONNECT tunnel) or when an
 * exchange ends, and proxies often reset idle connections later. Without a listener, that late
 * reset (ECONNRESET) would crash the main process. Errors that matter during an exchange still
 * reach the request's own 'error' handler; this only absorbs those that arrive after it.
 */
export function keepSocketErrorsHandled(socket: Socket): void {
  socket.on("error", ignoreLateError);
}

function ignoreLateError(): void {
  // The exchange is already settled (or failing through its own handler): nothing to report.
}
