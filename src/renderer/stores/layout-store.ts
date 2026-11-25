import { signal } from "./signal";

const STORAGE_KEY = "reqlab.layout";
const MIN_SHARE = 0.15;
const MAX_SHARE = 0.85;

interface Layout {
  /** The request editor's share of the height above the response (0.15–0.85). */
  requestShare: number;
  isResponseCollapsed: boolean;
  /** Closed with its ×: no panel at all; sending or Cmd/Ctrl+Shift+R brings it back. */
  isResponseHidden: boolean;
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
export const isResponseHidden = signal(saved.isResponseHidden);
export const isBodyWrapped = signal(saved.isBodyWrapped);
export const isEditorWrapped = signal(saved.isEditorWrapped);
/** The response fills the window (its full-screen button; Esc leaves). Not remembered across launches. */
export const isResponseFullScreen = signal(false);

export function toggleResponseFullScreen(): void {
  if (!isResponseFullScreen.get()) expandResponse();
  isResponseFullScreen.set(!isResponseFullScreen.get());
}

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

/** Cmd/Ctrl+Shift+R and the bottom bar's button: close the response, or bring it back. */
export function toggleResponse(): void {
  if (isResponseHidden.get()) expandResponse();
  else hideResponse();
}

/** The chevron by "Response" and the divider: fold the response to its bar, or unfold it. */
export function toggleResponseCollapsed(): void {
  if (isResponseHidden.get()) {
    expandResponse();
    return;
  }
  isResponseCollapsed.set(!isResponseCollapsed.get());
  saveLayout();
}

/** The response's ×: the panel goes away and the request takes the whole area. */
export function hideResponse(): void {
  isResponseFullScreen.set(false);
  isResponseHidden.set(true);
  saveLayout();
}

/** Shows the whole response (after sending, or the shortcut), whether it was collapsed or closed. */
export function expandResponse(): void {
  if (!isResponseCollapsed.get() && !isResponseHidden.get()) return;
  isResponseCollapsed.set(false);
  isResponseHidden.set(false);
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
      isResponseHidden: record["isResponseHidden"] === true,
      isBodyWrapped: record["isBodyWrapped"] !== false,
      isEditorWrapped: record["isEditorWrapped"] === true,
    };
  } catch {
    return {
      requestShare: 0.45,
      isResponseCollapsed: false,
      isResponseHidden: false,
      isBodyWrapped: true,
      isEditorWrapped: false,
    };
  }
}

function saveLayout(): void {
  try {
    const layout: Layout = {
      requestShare: requestShare.get(),
      isResponseCollapsed: isResponseCollapsed.get(),
      isResponseHidden: isResponseHidden.get(),
      isBodyWrapped: isBodyWrapped.get(),
      isEditorWrapped: isEditorWrapped.get(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage blocked: the layout simply resets next launch.
  }
}
