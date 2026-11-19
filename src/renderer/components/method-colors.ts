const METHOD_COLOR_TOKENS: Record<string, string> = {
  GET: "var(--method-get)",
  POST: "var(--method-post)",
  PUT: "var(--method-put)",
  PATCH: "var(--method-patch)",
  DELETE: "var(--method-delete)",
};

/** The design colours each HTTP method; anything else is grey. */
export function methodColor(method: string): string {
  return METHOD_COLOR_TOKENS[method.toUpperCase()] ?? "var(--method-other)";
}
