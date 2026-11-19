import { signal } from "./signal";

const STORAGE_KEY = "reqlab.layout";
const MIN_SHARE = 0.15;
const MAX_SHARE = 0.85;

interface Layout {
  /** The request editor's share of the height above the response (0.15–0.85). */
  requestShare: number;
  isResponseCollapsed: boolean;
  /** Long lines in the response body wrap (true) or scroll sideways (false). */
  isBodyWrapped: boolean;
  /** Long lines in the request body editor wrap. Off by default, as in code editors. */
  isEditorWrapped: boolean;
}

/**
 * How the request / response split looks. A display preference only (no workspace data),
 * so it lives in this window's local storage; a blocked or empty storage just means defaults.
 */
const saved = readSavedLayout();
export const requestShare = signal(saved.requestShare);
export const isResponseCollapsed = signal(saved.isResponseCollapsed);
export const isBodyWrapped = signal(saved.isBodyWrapped);
export const isEditorWrapped = signal(saved.isEditorWrapped);

export function toggleEditorWrap(): void {
  isEditorWrapped.set(!isEditorWrapped.get());
  saveLayout();
}

export function toggleBodyWrap(): void {
  isBodyWrapped.set(!isBodyWrapped.get());
  saveLayout();
}

export function setRequestShare(share: number): void {
  requestShare.set(clampShare(share));
  saveLayout();
}

export function toggleResponse(): void {
  isResponseCollapsed.set(!isResponseCollapsed.get());
  saveLayout();
}

export function collapseResponse(): void {
  if (isResponseCollapsed.get()) return;
  isResponseCollapsed.set(true);
  saveLayout();
}

export function expandResponse(): void {
  if (!isResponseCollapsed.get()) return;
  isResponseCollapsed.set(false);
  saveLayout();
}

function clampShare(share: number): number {
  return Number.isFinite(share) ? Math.min(MAX_SHARE, Math.max(MIN_SHARE, share)) : 0.45;
}

function readSavedLayout(): Layout {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const record = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    return {
      requestShare: clampShare(typeof record["requestShare"] === "number" ? record["requestShare"] : 0.45),
      isResponseCollapsed: record["isResponseCollapsed"] === true,
      isBodyWrapped: record["isBodyWrapped"] !== false,
      isEditorWrapped: record["isEditorWrapped"] === true,
    };
  } catch {
    return { requestShare: 0.45, isResponseCollapsed: false, isBodyWrapped: true, isEditorWrapped: false };
  }
}

function saveLayout(): void {
  try {
    const layout: Layout = {
      requestShare: requestShare.get(),
      isResponseCollapsed: isResponseCollapsed.get(),
      isBodyWrapped: isBodyWrapped.get(),
      isEditorWrapped: isEditorWrapped.get(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage blocked: the layout simply resets next launch.
  }
}
