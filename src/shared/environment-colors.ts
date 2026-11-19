/** The colour tags an environment can have (stored by name; the UI maps each to a colour). */
export const EnvironmentColors = ["green", "amber", "red", "purple", "blue", "teal", "pink", "gray"] as const;
export type EnvironmentColor = (typeof EnvironmentColors)[number];
