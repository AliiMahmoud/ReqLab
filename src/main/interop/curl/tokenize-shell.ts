import { ImportFailed } from "../../errors";

/**
 * Splits a pasted command line into words the way a POSIX shell would: 'single', "double" and
 * $'ANSI-C' quotes, backslash escapes, and line continuations (\ for bash, ^ for Windows cmd).
 * Nothing is ever executed or expanded: $VARS and `commands` stay as plain text.
 */
export function tokenizeShell(text: string): string[] {
  return new ShellReader(text).readWords();
}

const ANSI_ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  "\\": "\\",
  "'": "'",
  '"': '"',
  "0": "\0",
};

class ShellReader {
  #position = 0;
  #word = "";
  #hasWord = false;
  readonly #words: string[] = [];

  constructor(private readonly text: string) {}

  readWords(): string[] {
    while (this.#position < this.text.length) this.readNext();
    this.endWord();
    return this.#words;
  }

  private readNext(): void {
    const char = this.text[this.#position] ?? "";
    const next = this.text[this.#position + 1] ?? "";
    if (char === "\\") this.readEscape(next);
    else if (char === "^" && (next === "\n" || next === "\r")) this.skipLineBreak(1);
    else if (/\s/.test(char)) this.endWordAndSkip();
    else this.readQuotedOrPlain(char, next);
  }

  private readQuotedOrPlain(char: string, next: string): void {
    if (char === "'") this.readSingleQuoted();
    else if (char === '"') this.readDoubleQuoted();
    else if (char === "$" && next === "'") this.readAnsiQuoted();
    else this.append(char, 1);
  }

  private readEscape(next: string): void {
    if (next === "\n" || next === "\r") this.skipLineBreak(1);
    else this.append(next, 2);
  }

  /** Skips the continuation mark and its line break (\n or \r\n). */
  private skipLineBreak(markLength: number): void {
    this.#position += markLength;
    if (this.text[this.#position] === "\r") this.#position += 1;
    if (this.text[this.#position] === "\n") this.#position += 1;
  }

  private readSingleQuoted(): void {
    const end = this.text.indexOf("'", this.#position + 1);
    if (end < 0) throw new ImportFailed("The cURL command has an unclosed ' quote.");
    this.append(this.text.slice(this.#position + 1, end), end + 1 - this.#position);
  }

  /** Inside "…" a backslash only escapes " \\ $ ` and line breaks. */
  private readDoubleQuoted(): void {
    let index = this.#position + 1;
    let value = "";
    while (index < this.text.length && this.text[index] !== '"') {
      const [text, length] = readDoubleQuotedChar(this.text, index);
      value += text;
      index += length;
    }
    if (index >= this.text.length) throw new ImportFailed('The cURL command has an unclosed " quote.');
    this.append(value, index + 1 - this.#position);
  }

  /** $'…' as bash and Chrome's "Copy as cURL" write it: \n, \t, \', \xHH, \uHHHH. */
  private readAnsiQuoted(): void {
    let index = this.#position + 2;
    let value = "";
    while (index < this.text.length && this.text[index] !== "'") {
      if (this.text[index] === "\\") {
        const [decoded, length] = decodeAnsiEscape(this.text, index + 1);
        value += decoded;
        index += 1 + length;
      } else {
        value += this.text[index] ?? "";
        index += 1;
      }
    }
    if (index >= this.text.length) throw new ImportFailed("The cURL command has an unclosed $' quote.");
    this.append(value, index + 1 - this.#position);
  }

  private append(text: string, consumed: number): void {
    this.#word += text;
    this.#hasWord = true;
    this.#position += consumed;
  }

  private endWordAndSkip(): void {
    this.endWord();
    this.#position += 1;
  }

  private endWord(): void {
    if (this.#hasWord) this.#words.push(this.#word);
    this.#word = "";
    this.#hasWord = false;
  }
}

/** One character inside "…" (an escaped line break counts as nothing), and how many it used. */
function readDoubleQuotedChar(text: string, index: number): [string, number] {
  const char = text[index] ?? "";
  const next = text[index + 1] ?? "";
  if (char !== "\\" || next === "" || !'"\\$`\n'.includes(next)) return [char, 1];
  return [next === "\n" ? "" : next, 2];
}

/** Returns the decoded text and how many characters after the backslash it used. */
function decodeAnsiEscape(text: string, start: number): [string, number] {
  const kind = text[start] ?? "";
  const hex = (length: number): [string, number] => {
    const digits = /^[0-9a-fA-F]+/.exec(text.slice(start + 1, start + 1 + length))?.[0] ?? "";
    return digits === "" ? [kind, 1] : [String.fromCodePoint(parseInt(digits, 16)), 1 + digits.length];
  };
  if (kind === "x") return hex(2);
  if (kind === "u") return hex(4);
  if (kind === "U") return hex(8);
  return [ANSI_ESCAPES[kind] ?? `\\${kind}`, 1];
}
