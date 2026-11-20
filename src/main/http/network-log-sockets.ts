import type { Socket } from "node:net";
import type { TLSSocket } from "node:tls";

/** What the socket watcher needs from the log (kept narrow to avoid a circular import). */
interface SocketLog {
  add(text: string): void;
  noteNetwork(key: string, value: string): void;
}

/** Logs what happens on a connection ("proxy" or "server"): DNS, TCP, TLS, errors and the close. */
export function watchSocketForLog(log: SocketLog, socket: Socket, name: "proxy" | "server"): void {
  // Node passes null as the error on success, although its types say Error.
  socket.once("lookup", (error: Error | null, address: string) => {
    log.add(error === null ? `${name}: DNS resolved to ${address}` : `${name}: DNS failed: ${error.message}`);
  });
  socket.once("connect", () => {
    const address = `${socket.remoteAddress ?? "?"}:${String(socket.remotePort ?? "?")}`;
    log.noteNetwork(`${name}Address`, address);
    log.noteNetwork("localAddress", `${socket.localAddress ?? "?"}:${String(socket.localPort ?? "?")}`);
    log.add(`${name}: TCP connected to ${address}`);
  });
  socket.once("secureConnect", () => {
    noteTls(log, socket as TLSSocket, name);
  });
  socket.once("error", (error: NodeJS.ErrnoException) => {
    log.add(`${name}: error ${error.code ?? ""} ${error.message}`.trim());
  });
  socket.once("close", (hadError: boolean) => {
    log.add(`${name}: connection closed${hadError ? " after an error" : ""}`);
  });
}

/**
 * The TLS session and the server's certificate. A company proxy that inspects TLS shows up here:
 * its own CA is the issuer instead of a public one.
 */
function noteTls(log: SocketLog, tls: TLSSocket, name: string): void {
  const protocol = `${tls.getProtocol() ?? "?"}, ${tls.getCipher().name}`;
  log.noteNetwork("tls", protocol);
  const certificate = tls.getPeerCertificate();
  if (Object.keys(certificate).length > 0) {
    log.noteNetwork("certificateSubject", firstName(certificate.subject.CN));
    log.noteNetwork("certificateIssuer", firstName(certificate.issuer.CN ?? certificate.issuer.O));
    log.noteNetwork("certificateValid", `${certificate.valid_from} to ${certificate.valid_to}`);
    log.noteNetwork("certificateNames", (certificate.subjectaltname ?? "").slice(0, 1_000));
    log.noteNetwork("certificateFingerprint", certificate.fingerprint256);
  }
  log.noteNetwork("tlsVerified", tls.authorized ? "yes" : `no (${String(tls.authorizationError)})`);
  log.add(`${name}: TLS established (${protocol})`);
}

/** A certificate name field may hold one name or several. */
function firstName(value: string | string[] | undefined): string {
  return [value ?? "?"].flat()[0] ?? "?";
}
