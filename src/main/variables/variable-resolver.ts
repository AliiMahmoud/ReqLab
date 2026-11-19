import { createDynamicValue } from "./dynamic-variables";

const VARIABLE_REFERENCE = /\{\{([^{}]+)\}\}/g;
const MAX_NESTING = 10;

/**
 * Replaces {{name}} with values from the nearest scope that defines the name.
 * Values may reference other variables, up to 10 levels deep. Unknown names stay as written.
 */
export class VariableResolver {
  /** @param scopes nearest first, e.g. [environment, collection, globals] */
  constructor(private readonly scopes: readonly ReadonlyMap<string, string>[]) {}

  resolve(text: string): string {
    let current = text;
    for (let level = 0; level < MAX_NESTING; level += 1) {
      const next = current.replace(VARIABLE_REFERENCE, (reference, name: string) => {
        return this.lookUp(name.trim()) ?? reference;
      });
      if (next === current) return next;
      current = next;
    }
    return current;
  }

  private lookUp(name: string): string | undefined {
    if (name.startsWith("$")) return createDynamicValue(name);
    for (const scope of this.scopes) {
      const value = scope.get(name);
      if (value !== undefined) return value;
    }
    return undefined;
  }
}
