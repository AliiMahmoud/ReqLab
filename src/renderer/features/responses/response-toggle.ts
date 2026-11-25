import { css, html, type TemplateResult } from "lit";
import { responsePanelIcon } from "../../components/icons";
import { withShortcut } from "../../components/shortcut-label";
import { appSettings } from "../../stores/app-settings-store";
import { isResponseHidden, toggleResponse } from "../../stores/layout-store";

/**
 * The response's button in the bar under the request: closes the response panel, or opens it again
 * (as does Cmd/Ctrl+Shift+R). Hosts watch `isResponseHidden` and `appSettings`.
 */
export function renderResponseToggle(): TemplateResult {
  const isOpen = !isResponseHidden.get();
  const label = isOpen ? "Close the response" : "Open the response";
  return html`<button
    class="icon ghost response-toggle ${isOpen ? "is-open" : ""}"
    aria-pressed=${String(isOpen)}
    aria-label=${label}
    title=${withShortcut(label, "Mod+Shift+R")}
    @click=${toggleResponse}
  >
    ${responsePanelIcon(appSettings.get().responsePosition)}
  </button>`;
}

export const responseToggleStyles = css`
  .response-toggle {
    color: var(--color-text-faint);
  }
  .response-toggle.is-open {
    color: var(--color-text-muted);
  }
`;
