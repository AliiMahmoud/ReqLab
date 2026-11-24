import { StoredCookie } from "@shared/models/cookie";
import type { CookieRepository } from "../storage/repositories/cookie-repository";
import type { CookieChange } from "../scripts/sandbox-output";

/** The jar as plain data for pm.cookies (scripts can read it, as they can read variables). */
export function cookiesForScripts(jar: CookieRepository, now: Date): Record<string, unknown>[] {
  return jar.list(now).map((cookie) => ({
    domain: cookie.domain,
    path: cookie.path,
    name: cookie.name,
    value: cookie.value,
    expires: cookie.expiresAt,
    secure: cookie.isSecure,
    httpOnly: cookie.isHttpOnly,
    hostOnly: cookie.isHostOnly,
  }));
}

/** A host name or a [v6] address: what the sandbox may name as a cookie's domain. */
const VALID_DOMAIN = /^([a-z0-9-]+(\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])$/;

/**
 * Saves what pm.cookies.jar() set or removed, in order. The sandbox ran untrusted code, so a cookie
 * that is not valid (or names a domain that is not a host name) is skipped.
 */
export function saveScriptCookieChanges(
  jar: CookieRepository,
  changes: readonly CookieChange[],
  now: Date,
): void {
  for (const change of changes) {
    if (change.action === "delete") {
      jar.delete(change.cookie);
      continue;
    }
    const { cookie } = change;
    if (!VALID_DOMAIN.test(cookie.domain)) continue;
    const stored = StoredCookie.safeParse({
      domain: cookie.domain,
      path: cookie.path,
      name: cookie.name,
      value: cookie.value,
      expiresAt: cookie.expires,
      isSecure: cookie.secure,
      isHttpOnly: cookie.httpOnly,
      sameSite: null,
      isHostOnly: cookie.hostOnly,
    });
    if (stored.success) jar.save(stored.data, now);
  }
}
