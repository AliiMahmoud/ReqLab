import { css, html, type TemplateResult } from "lit";
import { checkIcon } from "../../components/icons";
import { safeStyle } from "../../directives/safe-style";
import { palettes, setPalette, shownKind } from "../../stores/theme-store";
import { PALETTES, type Palette } from "../../styles/theme-palettes";

const DEFAULT_SHADOW = { light: "0 12px 32px rgb(0 0 0 / 16%)", dark: "0 12px 32px rgb(0 0 0 / 45%)" };

export const themePickerStyles = css`
  .themes {
    display: grid;
    gap: var(--space-2);
    padding: 4px 0 14px;
  }
  .themes h3 {
    margin: 4px 0 0;
    color: var(--color-text-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  .card {
    display: grid;
    gap: 6px;
    padding: 6px;
    border: 2px solid transparent;
    border-radius: 12px;
    background: transparent;
    text-align: left;
  }
  .card:hover:not(:disabled) {
    background: var(--color-hover-tint);
  }
  .card[aria-pressed="true"] {
    border-color: var(--color-accent);
  }
  .card .label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px;
    font-size: 12.5px;
    color: var(--color-text);
  }
  .card .label svg {
    color: var(--color-accent);
  }
  /* A miniature of the app, drawn only with the theme's own colours. */
  .preview {
    position: relative;
    height: 92px;
    overflow: hidden;
    border: 1px solid var(--p-border);
    border-radius: 8px;
    background: var(--p-background);
  }
  .p-bar {
    height: 14px;
    background: var(--p-surface);
    border-bottom: 1px solid var(--p-border);
  }
  .p-side {
    position: absolute;
    top: 15px;
    bottom: 0;
    left: 0;
    width: 34%;
    padding: 8px 6px;
    display: grid;
    align-content: start;
    gap: 6px;
    background: var(--p-surface);
    border-right: 1px solid var(--p-border);
  }
  .p-line {
    height: 5px;
    border-radius: 3px;
    background: var(--p-muted);
    opacity: 0.55;
  }
  .p-line.text {
    background: var(--p-text);
    opacity: 0.8;
  }
  .p-main {
    position: absolute;
    top: 22px;
    left: calc(34% + 8px);
    right: 8px;
    display: grid;
    gap: 6px;
  }
  .p-send {
    justify-self: end;
    width: 34px;
    height: 12px;
    border-radius: 4px;
    background: var(--p-accent);
  }
  .p-popup {
    position: absolute;
    right: 10px;
    bottom: 8px;
    width: 42%;
    height: 22px;
    border: 1px solid var(--p-border);
    border-radius: 5px;
    background: var(--p-background);
    box-shadow: var(--p-shadow);
  }
`;

/** Settings › General: a card per colour theme, light ones and dark ones, like Postman's theme picker. */
export function renderThemePicker(): TemplateResult {
  return html`<div class="themes">
    <h3>Light theme</h3>
    <div class="cards">${PALETTES.filter((p) => p.kind === "light").map((p) => renderCard(p))}</div>
    <h3>Dark theme</h3>
    <div class="cards">${PALETTES.filter((p) => p.kind === "dark").map((p) => renderCard(p))}</div>
  </div>`;
}

function renderCard(palette: Palette): TemplateResult {
  const isChosen = palettes.get()[palette.kind] === palette.id;
  const isShown = isChosen && shownKind() === palette.kind;
  const choose = (): void => {
    setPalette(palette);
  };
  return html`<button
    class="card"
    aria-pressed=${String(isChosen)}
    title=${isShown ? `${palette.name} (in use)` : palette.name}
    @click=${choose}
  >
    ${renderPreview(palette)}
    <span class="label">${palette.name} ${isChosen ? checkIcon(14) : undefined}</span>
  </button>`;
}

/** The miniature: title bar, sidebar, text lines, an accent button and a popup with the theme's shadow. */
function renderPreview(palette: Palette): TemplateResult {
  const { background, surface, border, text, muted, accent } = palette.preview;
  const vars = {
    "--p-background": background,
    "--p-surface": surface,
    "--p-border": border,
    "--p-text": text,
    "--p-muted": muted,
    "--p-accent": accent,
    "--p-shadow": palette.tokens["--shadow-popup"] ?? DEFAULT_SHADOW[palette.kind],
  };
  return html`<div class="preview" style=${safeStyle(vars)} aria-hidden="true">
    <div class="p-bar"></div>
    <div class="p-side">
      <div class="p-line text"></div>
      <div class="p-line"></div>
      <div class="p-line"></div>
    </div>
    <div class="p-main">
      <div class="p-line text"></div>
      <div class="p-line"></div>
      <div class="p-send"></div>
    </div>
    <div class="p-popup"></div>
  </div>`;
}
