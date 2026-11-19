import { css } from "lit";

/** A centred card on the plain background: the welcome screen and the unlock card. */
export const entryCardStyles = css`
  :host {
    display: grid;
    place-items: center;
    min-height: 100%;
    padding: var(--space-6) var(--space-4);
  }
  .card {
    width: min(420px, 100%);
    display: grid;
    gap: var(--space-4);
    padding: 28px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-large);
    background: var(--color-surface);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 600;
    font-size: 15px;
  }
  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }
  .lead {
    margin: calc(var(--space-2) * -1) 0 0;
    color: var(--color-text-muted);
    line-height: 1.5;
  }
  .divider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-text-faint);
    font-size: 12px;
  }
  .divider::before,
  .divider::after {
    content: "";
    flex: 1;
    border-top: 1px solid var(--color-border);
  }
  .wide {
    width: 100%;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .links button {
    padding: 4px 10px;
    font-size: 12px;
  }
`;
