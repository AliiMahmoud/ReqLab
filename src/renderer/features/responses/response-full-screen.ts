import { html, type TemplateResult } from "lit";
import { exitFullScreenIcon, fullScreenIcon } from "../../components/icons";
import { isResponseFullScreen, toggleResponseFullScreen } from "../../stores/layout-store";

let isEscapeInstalled = false;

/** The response's full-screen button: fills the window, or goes back (as does Esc). */
export function renderFullScreenButton(): TemplateResult {
  const isFull = isResponseFullScreen.get();
  const label = isFull ? "Exit full screen (Esc)" : "Full screen";
  return html`<button
    class="close-panel"
    aria-label=${label}
    title=${label}
    @click=${toggleResponseFullScreen}
  >
    ${isFull ? exitFullScreenIcon() : fullScreenIcon()}
  </button>`;
}

/**
 * Esc leaves full screen. Whatever handles Esc first keeps it (the find box, a code editor's
 * suggestions), and Esc in a dialog only closes the dialog.
 */
export function installFullScreenEscape(): void {
  if (isEscapeInstalled) return;
  isEscapeInstalled = true;
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || !isResponseFullScreen.get()) return;
    if (event.composedPath().some((target) => target instanceof HTMLDialogElement)) return;
    event.preventDefault();
    toggleResponseFullScreen();
  });
}
