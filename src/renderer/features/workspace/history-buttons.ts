import { css, html, type TemplateResult } from "lit";
import { arrowLeftIcon, arrowRightIcon } from "../../components/icons";
import { canGoBack, canGoForward, goBack, goForward } from "../../stores/navigation-store";

const IS_MAC = navigator.userAgent.includes("Mac");
const BACK_KEYS = IS_MAC ? "⌘[" : "Alt+←";
const FORWARD_KEYS = IS_MAC ? "⌘]" : "Alt+→";

export const historyButtonStyles = css`
  .history {
    display: flex;
    gap: 2px;
    margin-left: 8px;
  }
  .history button {
    width: 28px;
    height: 28px;
  }
`;

/** ← → in the title bar: back and forward through the tabs and pages visited. Watch canGoBack / canGoForward. */
export function renderHistoryButtons(): TemplateResult {
  return html`<div class="history">
    <button
      class="icon ghost"
      aria-label="Back"
      title=${`Back (${BACK_KEYS})`}
      ?disabled=${!canGoBack.get()}
      @click=${goBack}
    >
      ${arrowLeftIcon()}
    </button>
    <button
      class="icon ghost"
      aria-label="Forward"
      title=${`Forward (${FORWARD_KEYS})`}
      ?disabled=${!canGoForward.get()}
      @click=${goForward}
    >
      ${arrowRightIcon()}
    </button>
  </div>`;
}
