import type { LitElement } from "lit";

/** Puts the cursor on the variable named `key` in the page's table (after it has rendered). */
export async function focusVariableRow(page: LitElement, key: string): Promise<void> {
  if (key === "") return;
  await page.updateComplete;
  const table = page.renderRoot.querySelector<LitElement>("variable-table");
  if (table === null) return;
  await table.updateComplete;
  const inputs = [...table.renderRoot.querySelectorAll<HTMLInputElement>("input.key")];
  const row = inputs.find((input) => input.value === key);
  row?.scrollIntoView({ block: "center" });
  row?.focus();
}
