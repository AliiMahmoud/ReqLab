import { z } from "zod";
import type { VariableOwner } from "@shared/models/environment";
import type { SqliteDatabase } from "../database";

const VariableRow = z.object({
  key: z.string(),
  value: z.string(),
  is_enabled: z.union([z.literal(0), z.literal(1)]),
});

/** A variable as stored. The old is_secret column stays in the table but is always 0 now. */
export interface StoredVariable {
  key: string;
  value: string;
  isEnabled: boolean;
}

export class VariableRepository {
  constructor(private readonly database: SqliteDatabase) {}

  list(owner: VariableOwner): StoredVariable[] {
    return this.database
      .prepare(
        "SELECT key, value, is_enabled FROM variables WHERE scope = ? AND scope_id = ? ORDER BY sort_order",
      )
      .all(owner.scope, ownerId(owner))
      .map((row) => toStoredVariable(VariableRow.parse(row)));
  }

  replaceAll(owner: VariableOwner, variables: readonly StoredVariable[]): void {
    const insert = this.database.prepare(
      `INSERT INTO variables (scope, scope_id, sort_order, key, value, is_secret, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    this.database.transaction(() => {
      this.database
        .prepare("DELETE FROM variables WHERE scope = ? AND scope_id = ?")
        .run(owner.scope, ownerId(owner));
      variables.forEach((variable, index) => {
        insert.run(owner.scope, ownerId(owner), index, variable.key, variable.value, ...flags(variable));
      });
    })();
  }
}

function ownerId(owner: VariableOwner): string {
  return owner.scope === "global" ? "" : owner.id;
}

function flags(variable: StoredVariable): [number, number] {
  return [0, variable.isEnabled ? 1 : 0];
}

function toStoredVariable(row: z.infer<typeof VariableRow>): StoredVariable {
  return { key: row.key, value: row.value, isEnabled: row.is_enabled === 1 };
}
