import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import type { ChosenImport, ImportKind } from "@shared/models/interop";
import { ImportFailed } from "../errors";
import { BUNDLE_MAGIC, hasMagic, PLAIN_BUNDLE_MAGIC } from "./bundle/bundle-format";
import { IMPORT_TOKEN_LIFETIME_MS, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_FILES } from "./import-limits";

export interface LoadedFile {
  name: string;
  bytes: Buffer;
}

interface PendingImport {
  kind: ImportKind;
  files: LoadedFile[];
  expiresAt: number;
}

/**
 * Files picked in main's own open dialog. They are read and size-checked here and kept under a
 * one-time token; the UI only gets the token and the names.
 */
export class ChosenFiles {
  readonly #pending = new Map<string, PendingImport>();

  async choose(): Promise<ChosenImport | null> {
    const paths = await showOpenDialog();
    if (paths.length === 0) return null;
    if (paths.length > MAX_IMPORT_FILES)
      throw new ImportFailed(`Pick at most ${String(MAX_IMPORT_FILES)} files.`);
    const files = await Promise.all(paths.map(readBoundedFile));
    const { kind, isEncrypted } = detectKind(files);
    const token = randomUUID();
    this.#pending.set(token, { kind, files, expiresAt: Date.now() + IMPORT_TOKEN_LIFETIME_MS });
    const fileNames = files.map((file) => file.name);
    return { token, kind, isEncrypted, fileNames, suggestedName: suggestName(files) };
  }

  /** The files behind a token. They stay available (e.g. to retry a mistyped passphrase) until forgotten. */
  get(token: string): PendingImport {
    const pending = this.#pending.get(token);
    if (pending === undefined || pending.expiresAt < Date.now()) {
      this.#pending.delete(token);
      throw new ImportFailed("Choose the files again: the selection expired.");
    }
    return pending;
  }

  forget(token: string): void {
    this.#pending.delete(token);
  }
}

async function showOpenDialog(): Promise<string[]> {
  const options: OpenDialogOptions = {
    title: "Import workspace",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "ReqLab bundle or collection export (.json)", extensions: ["reqlab", "json"] }],
  };
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const result =
    window === undefined
      ? await dialog.showOpenDialog(options)
      : await dialog.showOpenDialog(window, options);
  return result.canceled ? [] : result.filePaths;
}

async function readBoundedFile(path: string): Promise<LoadedFile> {
  const name = basename(path);
  const info = await stat(path);
  if (!info.isFile()) throw new ImportFailed(`"${name}" is not a file.`);
  if (info.size > MAX_IMPORT_FILE_BYTES) throw new ImportFailed(`"${name}" is larger than 50 MB.`);
  return { name, bytes: await readFile(path) };
}

/** A .reqlab bundle is recognised by its magic bytes, never by its name. One bundle per import. */
function detectKind(files: LoadedFile[]): { kind: ImportKind; isEncrypted: boolean } {
  const isBundle = (file: LoadedFile): boolean =>
    hasMagic(file.bytes, BUNDLE_MAGIC) || hasMagic(file.bytes, PLAIN_BUNDLE_MAGIC);
  if (!files.some(isBundle)) return { kind: "postman", isEncrypted: false };
  if (files.length > 1) throw new ImportFailed("Import one .reqlab bundle at a time, without other files.");
  return { kind: "reqlab", isEncrypted: files.some((file) => hasMagic(file.bytes, BUNDLE_MAGIC)) };
}

function suggestName(files: LoadedFile[]): string {
  const first = files[0]?.name
    .replace(/\.(reqlab|json)$/i, "")
    .replace(/\.postman_(collection|environment|globals)$/i, "");
  const name = (first ?? "").trim().slice(0, 100);
  return name === "" ? "Imported workspace" : name;
}
