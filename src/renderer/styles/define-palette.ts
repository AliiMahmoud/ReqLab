/**
 * The colour themes. Each light / dark theme overrides the base tokens of theme.css (an empty
 * `tokens` keeps the base), and `preview` holds the few colours its card in Settings is drawn with.
 */
export interface Palette {
  id: string;
  name: string;
  kind: "light" | "dark";
  tokens: Readonly<Record<string, string>>;
  preview: Record<"background" | "surface" | "border" | "text" | "muted" | "accent" | "accentText", string>;
}

/** The colours that define a theme; the other tokens keep theme.css's values for its kind. */
export type PaletteColors = Record<
  | "background"
  | "sunken"
  | "surface"
  | "raised"
  | "field"
  | "selected"
  | "border"
  | "borderSoft"
  | "fieldBorder"
  | "text"
  | "muted"
  | "faint"
  | "accent"
  | "accentHover"
  | "accentText"
  | "link"
  | "shadow",
  string
>;

/** Which token each defining colour sets (some set two). */
const TOKENS: [keyof PaletteColors, string][] = [
  ["background", "--color-background"],
  ["sunken", "--color-sunken"],
  ["surface", "--color-surface"],
  ["raised", "--color-raised"],
  ["field", "--color-field"],
  ["selected", "--color-selected"],
  ["border", "--color-border"],
  ["borderSoft", "--color-border-soft"],
  ["fieldBorder", "--color-field-border"],
  ["text", "--color-text"],
  ["text", "--color-text-soft"],
  ["muted", "--color-text-strong-muted"],
  ["muted", "--color-text-muted"],
  ["faint", "--color-text-faint"],
  ["accent", "--color-accent"],
  ["accentHover", "--color-accent-hover"],
  ["accentText", "--color-accent-text"],
  ["link", "--color-link"],
  ["shadow", "--shadow-popup"],
];

/** A theme from its defining colours. `isBase`: theme.css already holds it, so nothing is overridden. */
export function definePalette(
  identity: { id: string; name: string; kind: Palette["kind"]; isBase?: boolean },
  colors: PaletteColors,
): Palette {
  const { background, surface, border, text, faint: muted, accent, accentText } = colors;
  const tokens = Object.fromEntries(TOKENS.map(([color, token]) => [token, colors[color]]));
  return {
    id: identity.id,
    name: identity.name,
    kind: identity.kind,
    tokens: identity.isBase === true ? {} : tokens,
    preview: { background, surface, border, text, muted, accent, accentText },
  };
}
