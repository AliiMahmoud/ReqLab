/**
 * Re-indents XML or HTML, two spaces per level. An element that holds only text stays on one line.
 * Comments, CDATA, declarations and the contents of <script>, <style>, <pre> and <textarea> are kept
 * as they are. Returns undefined when the tags do not balance, so nothing is mangled.
 */
const TOKEN = /(<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![^>]*>|<\/?[A-Za-z][^>]*>)/;
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "pre", "textarea"]);
const INDENT = "  ";

type Kind = "open" | "close" | "standalone" | "text";

interface Token {
  kind: Kind;
  text: string;
  name: string;
}

export function formatMarkup(source: string): string | undefined {
  const tokens = tokenize(source);
  const lines: string[] = [];
  let depth = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const step = layOut(tokens, index, depth);
    if (step === undefined) return undefined;
    lines.push(step.line);
    depth = step.depth;
    index = step.lastIndex;
  }
  return depth === 0 ? lines.join("\n") : undefined;
}

/** One output line from the token at `index`: its indented text and the depth after it. */
function layOut(
  tokens: Token[],
  index: number,
  depth: number,
): { line: string; depth: number; lastIndex: number } | undefined {
  const token = tokens[index];
  if (token === undefined) return { line: "", depth, lastIndex: index };
  const lineDepth = token.kind === "close" ? depth - 1 : depth;
  if (lineDepth < 0) return undefined;
  const inline = joinTextOnlyElement(tokens, index);
  if (inline !== undefined)
    return { line: INDENT.repeat(lineDepth) + inline.text, depth: lineDepth, lastIndex: inline.lastIndex };
  const nextDepth = token.kind === "open" ? lineDepth + 1 : lineDepth;
  return { line: INDENT.repeat(lineDepth) + token.text, depth: nextDepth, lastIndex: index };
}

/** <name>text</name> or an empty <name></name> stays on one line. */
function joinTextOnlyElement(
  tokens: Token[],
  index: number,
): { text: string; lastIndex: number } | undefined {
  const [open, next, close] = [tokens[index], tokens[index + 1], tokens[index + 2]];
  if (open?.kind !== "open" || next === undefined) return undefined;
  if (closes(next, open)) return { text: open.text + next.text, lastIndex: index + 1 };
  if (next.kind !== "text" || close === undefined || !closes(close, open)) return undefined;
  return { text: open.text + next.text + close.text, lastIndex: index + 2 };
}

function closes(token: Token, open: Token): boolean {
  return token.kind === "close" && token.name === open.name;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const parts = source.split(TOKEN);
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? "";
    const token = classify(part);
    if (token === undefined) continue;
    tokens.push(token);
    if (token.kind === "open" && RAW_TEXT_ELEMENTS.has(token.name)) index = keepRawText(parts, index, tokens);
  }
  return tokens;
}

/** Everything up to the matching closing tag stays verbatim, as one text token. */
function keepRawText(parts: string[], openIndex: number, tokens: Token[]): number {
  const name = tokens.at(-1)?.name ?? "";
  const closeIndex = parts.findIndex(
    (part, index) => index > openIndex && part.toLowerCase().startsWith(`</${name}`),
  );
  const end = closeIndex === -1 ? parts.length : closeIndex;
  const text = parts
    .slice(openIndex + 1, end)
    .join("")
    .trim();
  if (text !== "") tokens.push({ kind: "text", text, name: "" });
  if (closeIndex !== -1) tokens.push({ kind: "close", text: parts[closeIndex] ?? "", name });
  return end;
}

function classify(part: string): Token | undefined {
  if (!part.startsWith("<") || !TOKEN.test(part)) {
    const text = part.trim();
    // Only the surrounding whitespace goes; text content itself is data and stays exactly as it is.
    return text === "" ? undefined : { kind: "text", text, name: "" };
  }
  const name = /^<\/?([A-Za-z][\w:.-]*)/.exec(part)?.[1]?.toLowerCase() ?? "";
  return { kind: kindOfTag(part, name), text: part, name };
}

function kindOfTag(tag: string, name: string): Kind {
  if (tag.startsWith("</")) return "close";
  if (name === "" || tag.endsWith("/>") || VOID_ELEMENTS.has(name)) return "standalone";
  return "open";
}
