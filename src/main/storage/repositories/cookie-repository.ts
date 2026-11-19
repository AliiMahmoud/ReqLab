import { z } from "zod";
import type { StoredCookie } from "@shared/models/cookie";
import type { SqliteDatabase } from "../database";

const MAX_COOKIES = 3_000;

const CookieRow = z.object({
  domain: z.string(),
  path: z.string(),
  name: z.string(),
  value: z.string(),
  expires_at: z.string().nullable(),
  is_secure: z.union([z.literal(0), z.literal(1)]),
  is_http_only: z.union([z.literal(0), z.literal(1)]),
  same_site: z.string().nullable(),
  is_host_only: z.union([z.literal(0), z.literal(1)]),
});

/** The workspace's cookie jar. Expired cookies are removed whenever cookies are read or stored. */
export class CookieRepository {
  constructor(private readonly database: SqliteDatabase) {}

  list(now: Date): StoredCookie[] {
    this.removeExpired(now);
    return this.database
      .prepare("SELECT * FROM cookies ORDER BY domain, path, name")
      .all()
      .map((row) => toCookie(CookieRow.parse(row)));
  }

  /** Stores or replaces a cookie; one that is already expired deletes its stored copy instead. */
  save(cookie: StoredCookie, now: Date): void {
    this.delete(cookie);
    if (cookie.expiresAt !== null && Date.parse(cookie.expiresAt) <= now.getTime()) return;
    this.database
      .prepare(
        `INSERT INTO cookies (domain, path, name, value, expires_at, is_secure, is_http_only, same_site, is_host_only)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(...toRow(cookie));
    this.database
      .prepare(
        "DELETE FROM cookies WHERE rowid NOT IN (SELECT rowid FROM cookies ORDER BY rowid DESC LIMIT ?)",
      )
      .run(MAX_COOKIES);
  }

  delete(key: { domain: string; path: string; name: string }): void {
    this.database
      .prepare("DELETE FROM cookies WHERE domain = ? AND path = ? AND name = ?")
      .run(key.domain, key.path, key.name);
  }

  clear(): void {
    this.database.prepare("DELETE FROM cookies").run();
  }

  private removeExpired(now: Date): void {
    this.database
      .prepare("DELETE FROM cookies WHERE expires_at IS NOT NULL AND expires_at <= ?")
      .run(now.toISOString());
  }
}

function toRow(cookie: StoredCookie): (string | number | null)[] {
  return [
    cookie.domain,
    cookie.path,
    cookie.name,
    cookie.value,
    cookie.expiresAt,
    cookie.isSecure ? 1 : 0,
    cookie.isHttpOnly ? 1 : 0,
    cookie.sameSite,
    cookie.isHostOnly ? 1 : 0,
  ];
}

function toCookie(row: z.infer<typeof CookieRow>): StoredCookie {
  return {
    domain: row.domain,
    path: row.path,
    name: row.name,
    value: row.value,
    expiresAt: row.expires_at,
    isSecure: row.is_secure === 1,
    isHttpOnly: row.is_http_only === 1,
    sameSite: row.same_site,
    isHostOnly: row.is_host_only === 1,
  };
}
