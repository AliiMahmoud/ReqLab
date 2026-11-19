import { DARK_PALETTES } from "./dark-palettes";
import type { Palette } from "./define-palette";
import { LIGHT_PALETTES } from "./light-palettes";

export type { Palette } from "./define-palette";

export const PALETTES: readonly Palette[] = [...LIGHT_PALETTES, ...DARK_PALETTES];

export const DEFAULT_PALETTE = { light: "daylight", dark: "night" } as const;

export function findPalette(id: string, kind: Palette["kind"]): Palette {
  return (
    PALETTES.find((palette) => palette.id === id && palette.kind === kind) ??
    PALETTES.find((palette) => palette.id === DEFAULT_PALETTE[kind]) ??
    (PALETTES[0] as Palette)
  );
}
