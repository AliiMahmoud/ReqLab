import type { Result } from "@shared/result";
import { signal } from "./signal";

/** A short message shown at the bottom of the workspace (errors and confirmations). */
export const notice = signal<{ text: string; isError: boolean } | undefined>(undefined);

let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function showNotice(text: string, isError = true): void {
  notice.set({ text, isError });
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    notice.set(undefined);
  }, 6000);
}

/** Unwraps an IPC result: the value, or undefined after showing the error. */
export async function callApi<T>(call: Promise<Result<T>>): Promise<T | undefined> {
  const result = await call;
  if (result.ok) return result.value;
  showNotice(result.error.message);
  return undefined;
}
