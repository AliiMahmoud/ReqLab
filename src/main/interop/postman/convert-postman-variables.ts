import { VariableKey } from "@shared/models/environment";
import { MAX_VALUE_LENGTH, MAX_VARIABLES_PER_SCOPE } from "@shared/limits";
import type { StoredVariable } from "../../storage/repositories/variable-repository";
import { asArray, asRecord, asText } from "./postman-values";

/** Postman variable rows (collection, environment or globals) → stored variables. Postman "secret" rows become plain variables. */
export function convertPostmanVariables(rows: unknown, warn: (message: string) => void): StoredVariable[] {
  const variables = asArray(rows).flatMap((row) => convertRow(asRecord(row), warn));
  if (variables.length > MAX_VARIABLES_PER_SCOPE) {
    warn(`Only the first ${String(MAX_VARIABLES_PER_SCOPE)} variables of a set were imported`);
  }
  return variables.slice(0, MAX_VARIABLES_PER_SCOPE);
}

function convertRow(
  row: Record<string, unknown> | undefined,
  warn: (message: string) => void,
): StoredVariable[] {
  if (row === undefined) return [];
  const key = VariableKey.safeParse(asText(row["key"]));
  if (!key.success) {
    warn("A variable with an empty or invalid name was skipped");
    return [];
  }
  const value = asText(row["value"]);
  if (value.length > MAX_VALUE_LENGTH) warn(`The value of "${key.data}" was too long and was cut`);
  return [
    {
      key: key.data,
      value: value.slice(0, MAX_VALUE_LENGTH),
      isEnabled: row["enabled"] !== false && row["disabled"] !== true,
    },
  ];
}
