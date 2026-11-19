/**
 * Which folders and collections are collapsed, per workspace, kept in this window's local storage
 * (a display preference, like the layout), so the tree looks the same after a reload or a restart.
 */
const KEY_PREFIX = "reqlab.collapsed.";

export function readCollapsed(workspaceId: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY_PREFIX + workspaceId) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveCollapsed(workspaceId: string, ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(KEY_PREFIX + workspaceId, JSON.stringify([...ids]));
  } catch {
    // Storage blocked: the tree simply opens expanded next time.
  }
}
