import type { VariableOwner } from "@shared/models/environment";

export const GLOBALS_DOT = "#8fb8f0";
export const COLLECTION_DOT = "#9aa3b2";

export function ownerKey(owner: VariableOwner): string {
  return owner.scope === "global" ? "global" : `${owner.scope}:${owner.id}`;
}

/** Replaces {{name}} using the table being edited, so the user sees what a template becomes. */
export function previewTemplate(
  template: string,
  variables: { key: string; value: string; isEnabled: boolean }[],
): string {
  const values = new Map(variables.filter((v) => v.isEnabled && v.key !== "").map((v) => [v.key, v.value]));
  return template.replace(
    /\{\{([^{}]+)\}\}/g,
    (reference, name: string) => values.get(name.trim()) ?? reference,
  );
}
