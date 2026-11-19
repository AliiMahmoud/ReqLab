import { signal } from "./signal";

/** Each kind of question can be silenced on its own with "Don't ask again". */
export type ConfirmKind =
  | "close-unsaved-tab"
  | "close-unsaved-tabs"
  | "delete-tree-item"
  | "delete-environment"
  | "clear-history"
  | "clear-cookies"
  | "send-protected"
  | "move-data";

/** The primary button, the optional second action (e.g. "Don't save"), or Cancel / × / Esc. */
export type ConfirmChoice = "primary" | "secondary" | "cancel";

export interface ConfirmRequest {
  kind: ConfirmKind;
  title: string;
  message: string;
  confirmLabel: string;
  /** A second action beside the primary one, e.g. "Don't save" next to "Save changes". */
  secondaryLabel?: string;
  isDanger: boolean;
}

interface Pending extends ConfirmRequest {
  resolve: (choice: ConfirmChoice) => void;
}

/** kind → the answer remembered with "Don't ask again". */
const STORAGE_KEY = "reqlab.rememberedAnswers";
/** The older format: a list of kinds whose answer was always "yes". */
const OLD_STORAGE_KEY = "reqlab.skippedConfirmations";

/** The question on screen, if any. The confirm-dialog component renders it. */
export const pendingConfirmation = signal<Pending | undefined>(undefined);

/**
 * Asks the user, or answers at once with what they chose before with "Don't ask again".
 * A display preference only, so it lives in this window's local storage.
 */
export function askToChoose(request: ConfirmRequest): Promise<ConfirmChoice> {
  const remembered = readRemembered()[request.kind];
  if (remembered !== undefined) return Promise.resolve(remembered);
  return new Promise((resolve) => {
    pendingConfirmation.get()?.resolve("cancel");
    pendingConfirmation.set({ ...request, resolve });
  });
}

/** A yes / no question: true for the primary button. */
export async function askToConfirm(request: ConfirmRequest): Promise<boolean> {
  return (await askToChoose(request)) === "primary";
}

/** Called by the dialog with the user's answer. Cancel is never remembered. */
export function answerConfirmation(choice: ConfirmChoice, dontAskAgain: boolean): void {
  const pending = pendingConfirmation.get();
  if (pending === undefined) return;
  if (choice !== "cancel" && dontAskAgain) saveRemembered({ ...readRemembered(), [pending.kind]: choice });
  pendingConfirmation.set(undefined);
  pending.resolve(choice);
}

export function resetSkippedConfirmations(): void {
  saveRemembered({});
  try {
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was remembered anyway.
  }
}

type Remembered = Partial<Record<ConfirmKind, ConfirmChoice>>;

function readRemembered(): Remembered {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
    return readOldFormat();
  } catch {
    return {};
  }
}

/**
 * Kinds silenced before answers were remembered meant "yes"; for closing an unsaved tab, "yes"
 * was "close without saving", which is now the second button.
 */
function readOldFormat(): Remembered {
  const parsed: unknown = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY) ?? "[]");
  if (!Array.isArray(parsed)) return {};
  const kinds = parsed.filter((kind): kind is ConfirmKind => typeof kind === "string");
  return Object.fromEntries(
    kinds.map((kind) => [kind, kind === "close-unsaved-tab" ? "secondary" : "primary"]),
  );
}

function saveRemembered(remembered: Remembered): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remembered));
  } catch {
    // Storage blocked: the questions simply keep being asked.
  }
}
