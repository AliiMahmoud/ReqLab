/** Pretty-prints JSON when the text parses; otherwise undefined. */
export function prettyPrintJson(text: string): string | undefined {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return undefined;
  }
}
