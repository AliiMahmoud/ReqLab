import { css, html, type TemplateResult } from "lit";
import { EnvironmentColors, type EnvironmentColor } from "@shared/environment-colors";
import { safeStyle } from "../../directives/safe-style";
import { ENVIRONMENT_COLOR_VALUES } from "./environment-colors";

export const colorTagPickerStyles = css`
  .swatches {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .swatch {
    width: 18px;
    height: 18px;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px var(--color-background);
  }
  .swatch[aria-checked="true"] {
    border-color: var(--color-text);
  }
  .swatch.none {
    background: transparent;
    border: 1px dashed var(--color-checkbox-border);
    box-shadow: none;
  }
  .swatch.none[aria-checked="true"] {
    border: 2px solid var(--color-text);
  }
`;

/** A row of colour dots (and "no colour") to tag an environment. */
export function renderColorTagPicker(
  current: EnvironmentColor | null,
  pick: (color: EnvironmentColor | null) => void,
): TemplateResult {
  const swatch = (color: EnvironmentColor | null): TemplateResult =>
    html`<button
      type="button"
      class="swatch ${color === null ? "none" : ""}"
      role="radio"
      aria-checked=${String(current === color)}
      aria-label=${color === null ? "No colour" : color}
      title=${color === null ? "No colour" : color}
      style=${safeStyle({ background: color === null ? undefined : ENVIRONMENT_COLOR_VALUES[color] })}
      @click=${() => {
        pick(color);
      }}
    ></button>`;
  return html`<div class="swatches" role="radiogroup" aria-label="Colour tag">
    ${EnvironmentColors.map((color) => swatch(color))} ${swatch(null)}
  </div>`;
}
