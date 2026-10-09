import themeNames from "../../themes.json" with { type: "json" };

/**
 * Every theme in themes.json, in both colour schemes. The accessibility checks
 * know nothing about any one brand, so a new theme is covered as soon as it is
 * listed there. Both schemes run even for a theme that renders one palette
 * today: the duplicate costs a few seconds, and it means a theme that gains a
 * light or dark palette later is checked without anyone remembering to add it.
 */
export const themes: readonly string[] = themeNames;

export const colorSchemes = ["light", "dark"] as const;

export type ColorScheme = (typeof colorSchemes)[number];
