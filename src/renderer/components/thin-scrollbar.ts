import { css } from "lit";

/**
 * A thin, rounded scrollbar for a scrolling host (the sidebar lists): faint until the pointer is
 * over the list, a little stronger then. Theme-aware: it is a shade of the text colour.
 */
export const thinScrollbarStyles = css`
  :host {
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--color-text) 14%, transparent) transparent;
  }
  :host(:hover) {
    scrollbar-color: color-mix(in srgb, var(--color-text) 28%, transparent) transparent;
  }
`;
