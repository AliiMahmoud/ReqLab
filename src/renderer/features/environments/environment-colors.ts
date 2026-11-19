import type { EnvironmentColor } from "@shared/environment-colors";

/** What each colour tag looks like; mid tones that read on light and dark backgrounds. */
export const ENVIRONMENT_COLOR_VALUES: Record<EnvironmentColor, string> = {
  green: "#3fb86b",
  amber: "#f0a030",
  red: "#e5534b",
  purple: "#a371f7",
  blue: "#4f8ff7",
  teal: "#2bb3a3",
  pink: "#e86bb0",
  gray: "#8b93a1",
};

/** Shown as an empty ring: the environment has no colour tag. */
export const NO_COLOR = "none";

/** The environment's colour tag, or NO_COLOR. */
export function environmentDot(environment: { color: EnvironmentColor | null }): string {
  return environment.color === null ? NO_COLOR : ENVIRONMENT_COLOR_VALUES[environment.color];
}
