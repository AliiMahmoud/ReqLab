import type { ImportReport } from "@shared/models/interop";
import type { WorkspaceSummary } from "@shared/models/workspace";
import { MAX_WARNINGS } from "./import-limits";

type Counter = "collections" | "folders" | "requests" | "environments" | "variables";

/** Counts what was imported and collects readable warnings (deduplicated, capped). */
export class ImportReportBuilder {
  readonly #counts: Record<Counter, number> = {
    collections: 0,
    folders: 0,
    requests: 0,
    environments: 0,
    variables: 0,
  };
  readonly #warnings = new Map<string, number>();

  count(counter: Counter, amount = 1): void {
    this.#counts[counter] += amount;
  }

  warn(message: string): void {
    this.#warnings.set(message, (this.#warnings.get(message) ?? 0) + 1);
  }

  build(workspace: WorkspaceSummary): ImportReport {
    const warnings = [...this.#warnings].map(([message, times]) =>
      times > 1 ? `${message} (${String(times)}×)` : message,
    );
    return {
      workspace,
      ...this.#counts,
      warnings: warnings.slice(0, MAX_WARNINGS).map((text) => text.slice(0, 500)),
    };
  }
}
