import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

/** What ReqLab stores itself. Electron's caches stay behind (they are rebuilt). */
export const DATA_ITEMS = ["app.db", "app.db-wal", "app.db-shm", "keys.json", "workspaces", "Local Storage"];

/**
 * Moves ReqLab's data between folders while nothing has it open (at startup): copies each item,
 * checks the copy matches, and only then removes the originals. Throws (leaving the source as it
 * was) if anything does not fit.
 */
export function moveDataFolder(from: string, to: string): void {
  const source = resolve(from);
  const target = resolve(to);
  if (source === target) return;
  if (isInside(target, source) || isInside(source, target))
    throw new Error("The new data folder cannot be inside the current one, or the other way round.");
  const items = DATA_ITEMS.filter((item) => existsSync(join(source, item)));
  mkdirSync(target, { recursive: true, mode: 0o700 });
  const clash = items.find((item) => existsSync(join(target, item)));
  if (clash !== undefined) throw new Error(`${target} already holds ReqLab data (${clash}).`);
  copyChecked(items, { source, target });
  for (const item of items) rmSync(join(source, item), { recursive: true, force: true });
}

/** Copies each item and checks the copies; on any difference the copies are removed and it throws. */
function copyChecked(items: string[], { source, target }: { source: string; target: string }): void {
  for (const item of items) {
    cpSync(join(source, item), join(target, item), { recursive: true, errorOnExist: true, force: false });
  }
  const different = items.find((item) => sizeOf(join(source, item)) !== sizeOf(join(target, item)));
  if (different === undefined) return;
  for (const item of items) rmSync(join(target, item), { recursive: true, force: true });
  throw new Error(`The copy of ${different} does not match the original; nothing was moved.`);
}

/** True when `path` lies inside `folder` (not the folder itself). */
export function isInside(path: string, folder: string): boolean {
  const between = relative(resolve(folder), resolve(path));
  return between !== "" && !between.startsWith("..") && !isAbsolute(between);
}

/** Total bytes of a file, or of everything in a folder. */
function sizeOf(path: string): number {
  const stats = lstatSync(path);
  if (!stats.isDirectory()) return stats.size;
  return readdirSync(path).reduce((total, name) => total + sizeOf(join(path, name)), 0);
}
