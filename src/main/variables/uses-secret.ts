import type { RequestDefinition } from "@shared/models/request";
import type { SecretMasker } from "./secret-masker";

/**
 * Whether a resolved request carries a secret value anywhere: URL, headers, body or auth fields.
 * Checked before encoding, so secrets hidden by Basic auth, AWS signing or JWT signing count too.
 */
export function usesSecret(resolved: RequestDefinition, masker: SecretMasker): boolean {
  return collectTexts(resolved).some((text) => masker.containsSecret(text));
}

function collectTexts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null) return [];
  return Object.values(value).flatMap(collectTexts);
}
