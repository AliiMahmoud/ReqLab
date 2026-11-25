import { css } from "lit";

/** The request area: the request / response split (below or beside), the dock outline, the bottom bar. */
export const requestAreaStyles = css`
  /* The bar under the request and response: the response's open / close button, on the left. */
  .request-footer {
    flex: none;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    /* Slim, and the same height as the left panel's bottom bar (sidebar-toggle.ts). */
    padding: 3px 8px;
    border-top: 1px solid var(--color-border-soft);
    background: var(--color-surface);
  }
  .request-footer .response-toggle {
    width: 26px;
    height: 26px;
  }
  :host {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  /* Request on top, response below, a draggable divider between them. */
  .split {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--color-border);
    min-height: 0;
  }
  request-editor {
    flex: none;
    min-height: 80px;
    overflow: auto;
  }
  response-panel {
    flex: 1;
    min-height: 41px;
  }
  .split.is-collapsed request-editor {
    flex: 1;
  }
  .split.is-collapsed response-panel {
    flex: none;
  }
  /* Docking the response by dragging its title bar (response-dock.ts): the spots, the lit one,
     the label at the pointer, and the response faded while it moves. */
  .dock-spot {
    position: absolute;
    z-index: 5;
    border: 1.5px dashed color-mix(in srgb, var(--color-accent) 45%, transparent);
    border-radius: var(--radius-large);
    background: color-mix(in srgb, var(--color-accent) 4%, transparent);
    pointer-events: none;
    transition:
      background-color 120ms ease,
      border-color 120ms ease;
  }
  .dock-spot.is-active {
    border: 2px solid var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 16%, transparent);
  }
  /* The grid (as in response-dock.ts): left and right side by side on top, below across the bottom. */
  .dock-spot {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent);
    font-weight: 600;
    font-size: calc(12px * var(--text-scale));
  }
  .dock-spot.is-left,
  .dock-spot.is-right {
    top: 6px;
    width: calc(50% - 9px);
    height: calc(60% - 9px);
  }
  .dock-spot.is-left {
    left: 6px;
  }
  .dock-spot.is-right {
    right: 6px;
  }
  .dock-spot.is-below {
    left: 6px;
    right: 6px;
    bottom: 6px;
    height: calc(40% - 9px);
  }
  .dock-label {
    position: absolute;
    z-index: 6;
    transform: translate(14px, 14px);
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--color-accent);
    color: var(--color-accent-text);
    font-size: calc(12px * var(--text-scale));
    font-weight: 600;
    white-space: nowrap;
    box-shadow: var(--shadow-popup);
    pointer-events: none;
  }
  .split.is-docking response-panel {
    opacity: 0.55;
  }
  /* Full screen: the response covers the whole window below the title bar (Esc leaves). */
  .split.is-full-screen response-panel {
    position: fixed;
    inset: var(--title-bar-height) 0 0 0;
    z-index: 50;
    background: var(--color-background);
  }
  @media (prefers-reduced-motion: reduce) {
    .dock-spot {
      transition: none;
    }
  }
  /* Settings › Response position: side by side, the response right or left of the request. */
  .split.is-right {
    flex-direction: row;
  }
  .split.is-left {
    flex-direction: row-reverse;
  }
  .split.is-right request-editor,
  .split.is-left request-editor {
    min-height: 0;
    min-width: 240px;
  }
  .split.is-right response-panel,
  .split.is-left response-panel {
    min-height: 0;
    min-width: 240px;
  }
`;
