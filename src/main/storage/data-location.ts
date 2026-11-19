import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { app } from "electron";
import { z } from "zod";
import { moveDataFolder } from "./move-data-folder";

/** Kept in the standard data folder: where the data really is, and a move asked for. */
const POINTER_FILE = "data-location.json";
const Pointer = z.object({
  path: z.string().nullable().default(null),
  pendingMove: z.string().optional(),
  error: z.string().optional(),
});
type Pointer = z.infer<typeof Pointer>;

let standardFolder = "";
let isPortable = false;

/**
 * At startup, before anything is opened: finishes a move asked for in Settings (the app restarted
 * for it), then points Electron's userData at the data folder. Portable mode keeps its own folder.
 */
export function applyDataLocation(portable: boolean): void {
  standardFolder = app.getPath("userData");
  isPortable = portable;
  if (portable) return;
  const pointer = readPointer();
  const current = pointer.path ?? standardFolder;
  const target = pointer.pendingMove === undefined ? current : finishMove(pointer, current);
  if (resolve(target) === resolve(standardFolder)) return;
  if (existsSync(target)) app.setPath("userData", target);
  else
    writePointer({
      ...readPointer(),
      error: `The data folder ${target} was not found (an unplugged drive?). Using the standard folder until it is back.`,
    });
}

function finishMove(pointer: Pointer, current: string): string {
  const target = pointer.pendingMove ?? current;
  try {
    moveDataFolder(current, target);
    writePointer({ path: resolve(target) === resolve(standardFolder) ? null : target });
    return target;
  } catch (error) {
    writePointer({
      path: pointer.path,
      error: `The data was not moved: ${error instanceof Error ? error.message : String(error)}`,
    });
    return current;
  }
}

/** For Settings: where the data is, whether it is the standard folder, and the last problem. */
export function describeDataLocation(): {
  path: string;
  isStandard: boolean;
  isPortable: boolean;
  error: string | null;
} {
  const path = app.getPath("userData");
  return {
    path,
    isStandard: resolve(path) === resolve(standardFolder),
    isPortable,
    error: readPointer().error ?? null,
  };
}

/** Records a move to `target` (undefined: the standard folder); it happens on the next start. */
export function scheduleDataMove(target: string | undefined): void {
  writePointer({ ...readPointer(), pendingMove: target ?? standardFolder, error: undefined });
}

export function currentDataFolder(): string {
  return app.getPath("userData");
}

function readPointer(): Pointer {
  try {
    return Pointer.parse(JSON.parse(readFileSync(join(standardFolder, POINTER_FILE), "utf8")));
  } catch {
    return { path: null };
  }
}

function writePointer(pointer: Pointer): void {
  const clean = Object.fromEntries(Object.entries(pointer).filter(([, value]) => value !== undefined));
  writeFileSync(join(standardFolder, POINTER_FILE), JSON.stringify(clean, null, 2), { mode: 0o600 });
}
