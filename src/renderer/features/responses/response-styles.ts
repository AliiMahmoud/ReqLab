import { css } from "lit";

export const responseStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: var(--color-sunken);
    position: relative;
  }
  /* A short accent segment sliding along the top border, for as long as the request is sending. */
  .loading-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2;
    height: 2px;
    overflow: hidden;
    pointer-events: none;
  }
  .loading-bar::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 35%;
    border-radius: 2px;
    background: var(--color-accent);
    animation: loading-slide 1.1s ease-in-out infinite;
  }
  @keyframes loading-slide {
    from {
      left: -35%;
    }
    to {
      left: 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-bar::before {
      width: 100%;
      opacity: 0.6;
      animation: none;
    }
  }
  .status-line {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 14px;
    min-height: 40px;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
    font-size: calc(12px * var(--text-scale));
    flex: none;
  }
  .status-line .section-tabs {
    border-bottom: none;
    padding: 0;
  }
  /* The scripts console button, before "Response". */
  .console {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin-left: -6px;
    padding: 0;
    border: none;
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--color-text-muted);
  }
  .console:hover:not(:disabled) {
    background: var(--color-hover-tint);
    color: var(--color-text);
  }
  .title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: -6px;
    padding: 4px 6px;
    border: none;
    background: transparent;
    font-weight: 600;
    font-size: calc(12px * var(--text-scale));
  }
  .close-panel {
    width: 26px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--color-text-faint);
  }
  .close-panel:hover:not(:disabled) {
    background: var(--color-selected);
    color: var(--color-text);
  }
  .title .chevron {
    display: inline-flex;
    color: var(--color-text-faint);
  }
  .pill {
    font-family: var(--font-ui);
    font-variant-numeric: tabular-nums;
    padding: 2px 8px;
    border-radius: var(--radius-small);
  }
  .pill.success {
    color: var(--color-success);
    background: var(--color-success-background);
  }
  .pill.redirect {
    color: var(--color-info);
    background: var(--color-selected);
  }
  .pill.client-error {
    color: var(--color-warning);
    background: var(--color-warning-background);
  }
  .pill.server-error {
    color: var(--color-danger);
    background: var(--color-danger-background);
  }
  .warnings {
    padding: var(--space-2) 14px;
    background: var(--color-warning-background);
    color: var(--color-warning);
    font-size: calc(12px * var(--text-scale));
    flex: none;
  }
  .warnings p {
    margin: 0;
  }
  .metric {
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-variant-numeric: tabular-nums;
  }
  pre {
    margin: 0;
    flex: 1;
    padding: var(--space-3) var(--space-4);
    font-family: var(--font-code);
    font-size: calc(12.5px * var(--text-scale));
    line-height: 1.7;
    overflow: auto;
    color: var(--color-text-soft);
    white-space: pre-wrap;
    word-break: break-all;
  }
  .key {
    color: var(--syntax-key);
  }
  .string {
    color: var(--syntax-string);
  }
  .literal {
    color: var(--syntax-literal);
  }
  iframe {
    flex: 1;
    border: none;
    background: #fff;
    min-height: 240px;
  }
  .footer {
    padding: 10px 14px;
    border-top: 1px solid var(--color-border);
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    font-family: var(--font-ui);
    font-variant-numeric: tabular-nums;
    font-size: calc(11px * var(--text-scale));
    color: var(--color-text-faint);
    flex: none;
  }
  .message {
    margin: auto;
    padding: var(--space-6);
    text-align: center;
    color: var(--color-text-muted);
    display: grid;
    gap: var(--space-3);
    justify-items: center;
    max-width: 420px;
    line-height: 1.6;
  }
  .message.is-sending svg {
    color: var(--color-accent);
    animation: sending-pulse 1.4s ease-in-out infinite;
  }
  @keyframes sending-pulse {
    50% {
      opacity: 0.45;
      transform: translateX(3px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .message.is-sending svg {
      animation: none;
    }
  }
  /* An error (e.g. ECONNREFUSED) shows the logo above it, still, in the error colour. */
  .message.is-error svg {
    opacity: 0.8;
  }
  .message.is-error {
    color: var(--color-danger);
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-family: var(--font-code);
    font-size: calc(12px * var(--text-scale));
  }
  td {
    padding: 6px 14px;
    border-bottom: 1px solid var(--color-border-soft);
    vertical-align: top;
    word-break: break-all;
  }
  td:first-child {
    color: var(--color-variable);
    width: 35%;
  }
  .scroll {
    flex: 1;
    overflow: auto;
  }
`;
