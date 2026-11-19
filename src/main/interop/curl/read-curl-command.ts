import { ImportFailed } from "../../errors";
import {
  emptyCommand,
  FLAG_OPTIONS,
  IGNORED_WITH_VALUE,
  SHORT_OPTIONS,
  VALUE_OPTIONS,
  type CurlCommand,
} from "./curl-options";
import { tokenizeShell } from "./tokenize-shell";

/** Reads `curl …` into its parts. Supports -XPOST, -sSL, --header=…, and options after the URL. */
export function readCurlCommand(text: string): CurlCommand {
  const words = tokenizeShell(text.trim());
  if (!/^curl(\.exe)?$/i.test(words[0] ?? "")) throw new ImportFailed("This is not a cURL command.");
  const command = emptyCommand();
  const queue = words.slice(1);
  while (queue.length > 0) readWord(command, queue);
  if (command.url === "") throw new ImportFailed("The cURL command has no URL.");
  return command;
}

function readWord(command: CurlCommand, queue: string[]): void {
  const word = queue.shift() ?? "";
  if (word.startsWith("--") && word.length > 2) readLongOption(command, word.slice(2), queue);
  else if (word.startsWith("-") && word.length > 1) readShortOptions(command, word.slice(1), queue);
  else if (command.url === "") command.url = word;
  else command.warnings.push(`"${word.slice(0, 60)}" was ignored (only one URL is used).`);
}

function readLongOption(command: CurlCommand, option: string, queue: string[]): void {
  const equals = option.indexOf("=");
  const name = equals < 0 ? option : option.slice(0, equals);
  const takeValue = (): string => (equals < 0 ? (queue.shift() ?? "") : option.slice(equals + 1));
  applyOption(command, name, takeValue);
}

/** "-sSL" is three flags; "-XPOST" or "-X POST" is -X with its value. */
function readShortOptions(command: CurlCommand, letters: string, queue: string[]): void {
  for (let index = 0; index < letters.length; index += 1) {
    const name = SHORT_OPTIONS[letters[index] ?? ""];
    if (name === undefined) continue; // flags such as -s, -L, -k, -v: no effect on the request
    const rest = letters.slice(index + 1);
    if (takesValue(name)) {
      applyOption(command, name, () => (rest === "" ? (queue.shift() ?? "") : rest));
      return;
    }
    applyOption(command, name, () => "");
  }
}

function applyOption(command: CurlCommand, name: string, takeValue: () => string): void {
  const valueOption = VALUE_OPTIONS[name];
  if (valueOption !== undefined) valueOption(command, takeValue());
  else if (IGNORED_WITH_VALUE.has(name)) takeValue();
  else FLAG_OPTIONS[name]?.(command);
}

function takesValue(name: string): boolean {
  return VALUE_OPTIONS[name] !== undefined || IGNORED_WITH_VALUE.has(name);
}
