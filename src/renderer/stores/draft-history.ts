import type { RequestDefinition } from "@shared/models/request";

/** Edits of the same fields closer together than this are one undo step (a typed word, not each key). */
const MERGE_MS = 1_000;
const MAX_STEPS = 200;

type Draft = Partial<RequestDefinition>;

/** One undoable edit: only the fields it changed, as they were before and after. */
interface Step {
  fields: string;
  before: Draft;
  after: Draft;
  at: number;
}

interface History {
  past: Step[];
  future: Step[];
}

/**
 * Each request tab's undo history, kept apart from the fields on screen, so it survives switching
 * to another tab, a folder's settings, the Environments page or another body type and back.
 * Undoing a step restores only the fields that step changed. Memory only.
 */
const histories = new Map<string, History>();

/** Records an edit about to be applied to the tab's draft (`current` is the draft before it). */
export function recordDraftEdit(tabId: string, current: RequestDefinition, change: Draft): void {
  const now = Date.now();
  const history = historyOf(tabId);
  const fields = Object.keys(change).sort().join(",");
  const last = history.past.at(-1);
  history.future = [];
  if (last !== undefined && last.fields === fields && now - last.at < MERGE_MS) {
    last.after = { ...last.after, ...change };
    last.at = now;
    return;
  }
  history.past.push({ fields, before: pick(current, Object.keys(change)), after: { ...change }, at: now });
  if (history.past.length > MAX_STEPS) history.past.shift();
}

/** The fields to put back for one undo, or undefined when there is nothing to undo. */
export function takeUndo(tabId: string): Draft | undefined {
  const history = historyOf(tabId);
  const step = history.past.pop();
  if (step === undefined) return undefined;
  history.future.push({ ...step, at: 0 });
  return step.before;
}

/** The fields to put back for one redo, or undefined when there is nothing to redo. */
export function takeRedo(tabId: string): Draft | undefined {
  const history = historyOf(tabId);
  const step = history.future.pop();
  if (step === undefined) return undefined;
  // Never merged with a following edit: a redone step stays a step of its own.
  history.past.push({ ...step, at: 0 });
  return step.after;
}

export function forgetDraftHistory(tabId: string): void {
  histories.delete(tabId);
}

function historyOf(tabId: string): History {
  let history = histories.get(tabId);
  if (history === undefined) {
    history = { past: [], future: [] };
    histories.set(tabId, history);
  }
  return history;
}

function pick(draft: RequestDefinition, fields: string[]): Draft {
  const source = draft as Record<string, unknown>;
  return Object.fromEntries(fields.map((field) => [field, source[field]]));
}
