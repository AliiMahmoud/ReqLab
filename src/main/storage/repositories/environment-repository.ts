import { randomUUID } from "node:crypto";
import { z } from "zod";
import { EnvironmentColors, type EnvironmentColor } from "@shared/environment-colors";
import type { Environment } from "@shared/models/environment";
import { EnvironmentNotFound } from "../../errors";
import type { SqliteDatabase } from "../database";

export class EnvironmentRepository {
  constructor(private readonly database: SqliteDatabase) {}

  list(): Environment[] {
    return this.database
      .prepare("SELECT id, name, is_protected, color FROM environments ORDER BY sort_order, name")
      .all()
      .map((row) => toEnvironment(EnvironmentRow.parse(row)));
  }

  find(id: string): Environment | undefined {
    return this.list().find((environment) => environment.id === id);
  }

  setColor(id: string, color: EnvironmentColor | null): void {
    const result = this.database.prepare("UPDATE environments SET color = ? WHERE id = ?").run(color, id);
    if (result.changes === 0) throw new EnvironmentNotFound();
  }

  setProtected(id: string, isProtected: boolean): void {
    const result = this.database
      .prepare("UPDATE environments SET is_protected = ? WHERE id = ?")
      .run(isProtected ? 1 : 0, id);
    if (result.changes === 0) throw new EnvironmentNotFound();
  }

  create(name: string): Environment {
    const environment: Environment = { id: randomUUID(), name, isProtected: false, color: null };
    const last: unknown = this.database.prepare("SELECT MAX(sort_order) FROM environments").pluck().get();
    this.database
      .prepare("INSERT INTO environments (id, name, sort_order) VALUES (?, ?, ?)")
      .run(environment.id, name, typeof last === "number" ? last + 1 : 0);
    return environment;
  }

  rename(id: string, name: string): void {
    const result = this.database.prepare("UPDATE environments SET name = ? WHERE id = ?").run(name, id);
    if (result.changes === 0) throw new EnvironmentNotFound();
  }

  delete(id: string): void {
    this.database.transaction(() => {
      const result = this.database.prepare("DELETE FROM environments WHERE id = ?").run(id);
      if (result.changes === 0) throw new EnvironmentNotFound();
      this.database.prepare("DELETE FROM variables WHERE scope = 'environment' AND scope_id = ?").run(id);
    })();
  }

  assertExists(id: string): void {
    if (this.database.prepare("SELECT 1 FROM environments WHERE id = ?").get(id) === undefined) {
      throw new EnvironmentNotFound();
    }
  }
}

const EnvironmentRow = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(200),
  is_protected: z.union([z.literal(0), z.literal(1)]),
  // An unknown name (a newer version's colour) reads as no colour rather than failing.
  color: z.enum(EnvironmentColors).nullable().catch(null),
});

function toEnvironment(row: z.infer<typeof EnvironmentRow>): Environment {
  return { id: row.id, name: row.name, isProtected: row.is_protected === 1, color: row.color };
}
