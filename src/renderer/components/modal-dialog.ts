import { api } from "../api";

/**
 * Every modal <dialog> opens through here, so the main process knows when one is open and can
 * disable the window's own buttons (−, □, ×), which the page's backdrop cannot cover.
 */
const openDialogs = new Set<HTMLDialogElement>();
/** A dialog removed from the page while open fires no 'close': check again until none is left. */
const RECHECK_MS = 1000;
let recheckTimer: ReturnType<typeof setInterval> | undefined;
let isWindowModal = false;

export function showModal(dialog: HTMLDialogElement | null): void {
  if (dialog === null || dialog.open) return;
  dialog.showModal();
  openDialogs.add(dialog);
  dialog.addEventListener("close", refreshWindowModal, { once: true });
  refreshWindowModal();
}

function refreshWindowModal(): void {
  for (const dialog of openDialogs) {
    if (!dialog.open || !dialog.isConnected) openDialogs.delete(dialog);
  }
  const isOpen = openDialogs.size > 0;
  keepRechecking(isOpen);
  if (isOpen === isWindowModal) return;
  isWindowModal = isOpen;
  void api.setWindowModal({ isOpen });
}

function keepRechecking(isOpen: boolean): void {
  if (isOpen && recheckTimer === undefined) recheckTimer = setInterval(refreshWindowModal, RECHECK_MS);
  if (!isOpen && recheckTimer !== undefined) {
    clearInterval(recheckTimer);
    recheckTimer = undefined;
  }
}
