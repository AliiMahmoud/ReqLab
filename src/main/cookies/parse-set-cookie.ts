import type { StoredCookie } from "@shared/models/cookie";
import { defaultPath, domainMatches, isIpAddress } from "./cookie-rules";

const MAX_COOKIE_LENGTH = 8_192;

interface Attributes {
  domain?: string;
  path?: string;
  expiresAt?: string | null;
  maxAgeSeconds?: number;
  isSecure: boolean;
  isHttpOnly: boolean;
  sameSite: string | null;
}

/**
 * One Set-Cookie header → a cookie to store, or undefined when it must be ignored:
 * malformed, too long, a Secure cookie over http, or a Domain the response may not set.
 */
export function parseSetCookie(header: string, requestUrl: URL, now: Date): StoredCookie | undefined {
  if (header.length > MAX_COOKIE_LENGTH) return undefined;
  const [pair = "", ...attributeParts] = header.split(";");
  const nameValue = parseNameValue(pair);
  const attributes = readAttributes(attributeParts, now);
  if (nameValue === undefined || (attributes.isSecure && requestUrl.protocol !== "https:")) return undefined;
  const scope = scopeFor(attributes.domain, requestUrl.hostname.toLowerCase());
  if (scope === undefined) return undefined;
  return {
    ...nameValue,
    ...scope,
    path: pathFor(attributes.path, requestUrl),
    expiresAt: attributes.expiresAt ?? null,
    isSecure: attributes.isSecure,
    isHttpOnly: attributes.isHttpOnly,
    sameSite: attributes.sameSite,
  };
}

function parseNameValue(pair: string): { name: string; value: string } | undefined {
  const separator = pair.indexOf("=");
  const name = separator <= 0 ? "" : pair.slice(0, separator).trim();
  return name === "" ? undefined : { name, value: stripQuotes(pair.slice(separator + 1).trim()) };
}

/** A Path attribute must start with "/"; otherwise the request path's directory is used. */
function pathFor(pathAttribute: string | undefined, requestUrl: URL): string {
  return pathAttribute?.startsWith("/") === true ? pathAttribute : defaultPath(requestUrl.pathname);
}

/** No Domain: host-only. A Domain must cover the request host and not be a bare top-level name or an IP. */
function scopeFor(
  domainAttribute: string | undefined,
  host: string,
): { domain: string; isHostOnly: boolean } | undefined {
  if (domainAttribute === undefined || domainAttribute === "") return { domain: host, isHostOnly: true };
  const domain = domainAttribute.replace(/^\./, "").toLowerCase();
  if (!domain.includes(".") || isIpAddress(domain) !== isIpAddress(host)) return undefined;
  return domainMatches(host, domain, false) ? { domain, isHostOnly: false } : undefined;
}

function readAttributes(parts: string[], now: Date): Attributes {
  const attributes: Attributes = { isSecure: false, isHttpOnly: false, sameSite: null };
  for (const part of parts) {
    const [rawName = "", ...rest] = part.split("=");
    applyAttribute(attributes, { name: rawName.trim().toLowerCase(), value: rest.join("=").trim() }, now);
  }
  if (attributes.maxAgeSeconds !== undefined) {
    attributes.expiresAt = new Date(now.getTime() + attributes.maxAgeSeconds * 1000).toISOString();
  }
  return attributes;
}

type AttributeSetter = (attributes: Attributes, value: string, now: Date) => void;

const ATTRIBUTE_SETTERS: Record<string, AttributeSetter> = {
  domain: (attributes, value) => {
    attributes.domain = value;
  },
  path: (attributes, value) => {
    attributes.path = value;
  },
  secure: (attributes) => {
    attributes.isSecure = true;
  },
  httponly: (attributes) => {
    attributes.isHttpOnly = true;
  },
  samesite: (attributes, value) => {
    attributes.sameSite = value.slice(0, 16);
  },
  "max-age": (attributes, value) => {
    if (/^-?\d+$/.test(value)) attributes.maxAgeSeconds = Math.max(-1, Number(value));
  },
  expires: (attributes, value, now) => {
    attributes.expiresAt = parseExpires(value, now);
  },
};

function applyAttribute(
  attributes: Attributes,
  { name, value }: { name: string; value: string },
  now: Date,
): void {
  ATTRIBUTE_SETTERS[name]?.(attributes, value, now);
}

/** An unparsable date is ignored (the cookie becomes a session cookie), as browsers do. */
function parseExpires(value: string, now: Date): string | null {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(Math.max(time, now.getTime() - 1000)).toISOString();
}

function stripQuotes(value: string): string {
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}
