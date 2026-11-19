import { createHash, randomBytes } from "node:crypto";

export interface DigestChallenge {
  realm: string;
  nonce: string;
  qop: string | undefined;
  algorithm: string;
  opaque: string | undefined;
}

export interface DigestAnswer {
  username: string;
  password: string;
  method: string;
  /** Path and query, exactly as sent ("/dir/index.html?x=1"). */
  uri: string;
  body: Buffer | undefined;
  /** Fixed only in tests; otherwise random. */
  cnonce?: string;
}

const HASHES: Record<string, string> = { MD5: "md5", "SHA-256": "sha256", "SHA-512-256": "sha512-256" };

/** Reads "WWW-Authenticate: Digest realm=…, nonce=…"; undefined when it is not a usable Digest challenge. */
export function parseDigestChallenge(header: string): DigestChallenge | undefined {
  if (!/^\s*digest\s/i.test(header)) return undefined;
  const params = readParams(header);
  const realm = params.get("realm");
  const nonce = params.get("nonce");
  if (realm === undefined || nonce === undefined) return undefined;
  return {
    realm,
    nonce,
    qop: pickQop(params.get("qop")),
    algorithm: params.get("algorithm") ?? "MD5",
    opaque: params.get("opaque"),
  };
}

/** name=value and name="quoted, \"escaped\" value" pairs. */
function readParams(header: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const match of header.matchAll(/([a-z0-9-]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s,]+))/gi)) {
    params.set((match[1] ?? "").toLowerCase(), match[2]?.replace(/\\(.)/g, "$1") ?? match[3] ?? "");
  }
  return params;
}

/** "auth" when offered (it covers the most servers), else "auth-int", else none (RFC 2069 style). */
function pickQop(offered: string | undefined): string | undefined {
  const options = offered?.split(",").map((value) => value.trim()) ?? [];
  if (options.includes("auth")) return "auth";
  return options.includes("auth-int") ? "auth-int" : undefined;
}

/** The Authorization header for a Digest challenge (RFC 7616; RFC 2617 compatible). */
export function answerDigestChallenge(challenge: DigestChallenge, answer: DigestAnswer): string | undefined {
  const isSession = challenge.algorithm.toUpperCase().endsWith("-SESS");
  const algorithm = HASHES[challenge.algorithm.toUpperCase().replace(/-SESS$/, "")];
  if (algorithm === undefined) return undefined;
  const hash = (text: string | Buffer): string => createHash(algorithm).update(text).digest("hex");
  const cnonce = answer.cnonce ?? randomBytes(8).toString("hex");
  const nc = "00000001";
  const baseHa1 = hash(`${answer.username}:${challenge.realm}:${answer.password}`);
  const ha1 = isSession ? hash(`${baseHa1}:${challenge.nonce}:${cnonce}`) : baseHa1;
  const bodyHash = challenge.qop === "auth-int" ? `:${hash(answer.body ?? Buffer.alloc(0))}` : "";
  const ha2 = hash(`${answer.method}:${answer.uri}${bodyHash}`);
  const response =
    challenge.qop === undefined
      ? hash(`${ha1}:${challenge.nonce}:${ha2}`)
      : hash(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${challenge.qop}:${ha2}`);
  return formatHeader({ challenge, answer, response, cnonce, nc });
}

function formatHeader(parts: {
  challenge: DigestChallenge;
  answer: DigestAnswer;
  response: string;
  cnonce: string;
  nc: string;
}): string {
  const { challenge, answer, response, cnonce, nc } = parts;
  const fields = [
    `username="${quote(answer.username)}"`,
    `realm="${quote(challenge.realm)}"`,
    `nonce="${quote(challenge.nonce)}"`,
    `uri="${quote(answer.uri)}"`,
    `algorithm=${challenge.algorithm}`,
    `response="${response}"`,
  ];
  if (challenge.qop !== undefined) fields.push(`qop=${challenge.qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  if (challenge.opaque !== undefined) fields.push(`opaque="${quote(challenge.opaque)}"`);
  return `Digest ${fields.join(", ")}`;
}

function quote(text: string): string {
  return text.replace(/["\\]/g, "\\$&");
}
