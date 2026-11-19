import { css, html, type TemplateResult } from "lit";
import { sidebarIcon } from "../../components/icons";
import { isSidebarHidden, toggleSidebar } from "../../stores/sidebar-width-store";

/** The bottom-left button that hides the left panel, or shows it again from the thin strip. */
export function renderSidebarToggle(): TemplateResult {
  const label = isSidebarHidden.get() ? "Show left panel" : "Hide left panel";
  return html`<button
    class="icon ghost sidebar-toggle"
    aria-label=${label}
    title=${label}
    @click=${toggleSidebar}
  >
    ${sidebarIcon()}
  </button>`;
}

/** The sidebar's footer row, and the strip left behind while the panel is hidden. */
export const sidebarToggleStyles = css`
  .sidebar-footer {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    border-top: 1px solid var(--color-border-soft);
  }
  .sidebar-rail {
    flex: 0 0 40px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    padding: 6px 0;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .sidebar-toggle {
    color: var(--color-text-muted);
  }
`;
