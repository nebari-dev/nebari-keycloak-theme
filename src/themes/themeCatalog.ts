import type { CSSProperties } from "react";
import {
    DEFAULT_BRANDING_CONFIG,
    TEMPLATE_BRANDING_CONFIG,
    parseBrandingConfig,
    type BrandingConfig
} from "../branding/brandingConfig";
/**
 * The single registry of theme names, shared with `vite.config.ts` and
 * `scripts/build-keycloak-themes.mjs`. Those two run in Node and cannot import
 * this module's React-typed dependencies, which is why the names live in plain
 * JSON and the metadata lives here, keyed by them.
 *
 * Order is meaningful: the first name is the theme keycloakify packages as
 * primary and the one `DEFAULT_THEME_NAME` falls back to.
 */
import themeNames from "../../themes.json";

export type BrandingMessageKey = "nebariBrandingConfig";

/**
 * Which component library a theme's login pages are built from. The two are not
 * interchangeable — Base UI and Radix expose different control APIs — so each
 * component set has its own page implementations, selected in `KcPage`.
 */
export type ThemeComponentSet = "nebari" | "shadcn";

export type ThemeLogo = {
    light: string;
    dark: string;
    width: number;
    height: number;
    lightFilter?: string;
    darkFilter?: string;
};

/**
 * A theme's metadata as the catalog stores it. The name is the catalog key
 * rather than a field, so the two cannot drift; `ThemeDefinition` adds it back
 * for the consumers that need to read it off the object.
 */
type ThemeDefinitionData = {
    displayName: string;
    description: string;
    brandingMessageKey: BrandingMessageKey;
    defaultBranding: BrandingConfig;
    componentSet: ThemeComponentSet;
    /**
     * Whether this theme's Admin Console offers the **Theme customization**
     * page. Read at build time into the theme's `theme.properties`, so a theme
     * that has no use for the editor ships without it rather than hiding it at
     * runtime. A deployment can still override this either way — see
     * `src/admin/themeCustomization.ts`.
     */
    themeCustomization: boolean;
    /**
     * The theme's own artwork, used for the login card and both console
     * mastheads. Omitted by themes that ship none, which fall back to the
     * realm's display name as a wordmark.
     */
    logo?: ThemeLogo;
    source?: {
        homepage: string;
        logo: string;
    };
};

const THEME_CATALOG = {
    /**
     * The unbranded starting point. It carries no logo, no wordmark and no
     * accent hue on purpose — everything visible is meant to be replaced by
     * whoever deploys it, either in the Theme customization console or by
     * editing `src/login/template/`.
     */
    template: {
        displayName: "Template",
        description:
            "Unbranded shadcn/ui starting point. No logo or brand colours — customize it to make it yours.",
        brandingMessageKey: "nebariBrandingConfig",
        defaultBranding: TEMPLATE_BRANDING_CONFIG,
        componentSet: "shadcn",
        /* The editor is the whole point of this theme: it ships unbranded and
           the deployment makes it theirs from the console. */
        themeCustomization: true,
        source: {
            homepage: "https://ui.shadcn.com",
            logo: "https://ui.shadcn.com"
        }
    },
    nebari: {
        displayName: "Nebari",
        description: "The Nebari design system theme, with Nebari branding.",
        brandingMessageKey: "nebariBrandingConfig",
        defaultBranding: DEFAULT_BRANDING_CONFIG,
        componentSet: "nebari",
        themeCustomization: true,
        logo: {
            light: "logo/nebari-logo-light.svg",
            dark: "logo/nebari-logo-dark.svg",
            width: 160,
            height: 40
        },
        source: {
            homepage: "https://www.nebari.dev/",
            logo: "https://github.com/nebari-dev/nebari-design"
        }
    }
} satisfies Record<string, ThemeDefinitionData>;

export type CustomThemeName = keyof typeof THEME_CATALOG;

export type ThemeDefinition = ThemeDefinitionData & { name: CustomThemeName };

/* `hasOwnProperty` rather than `in`: the name reaching this comes from the
   realm's theme setting, and `"toString" in THEME_CATALOG` is true. */
function isCustomThemeName(value: string): value is CustomThemeName {
    return Object.prototype.hasOwnProperty.call(THEME_CATALOG, value);
}

/**
 * The build's themes, in `themes.json` order.
 *
 * Both halves of the registry are checked against each other here rather than
 * left to agree by convention. A name in `themes.json` with no catalog entry
 * would package a theme whose login pages fall back to another theme's; a
 * catalog entry missing from `themes.json` would be reachable in dev and never
 * built into a JAR. Both are silent failures at runtime, so they are made loud
 * at module load instead — and `vite.config.ts` imports this module, which
 * turns that into a failed build rather than a blank page.
 */
export const CUSTOM_THEME_NAMES: readonly CustomThemeName[] = (() => {
    const uncatalogued = themeNames.filter(name => !isCustomThemeName(name));
    const unpackaged = Object.keys(THEME_CATALOG).filter(
        name => !themeNames.includes(name)
    );

    if (uncatalogued.length !== 0 || unpackaged.length !== 0) {
        throw new Error(
            [
                "themes.json and THEME_CATALOG disagree.",
                uncatalogued.length !== 0 &&
                    `In themes.json with no catalog entry: ${uncatalogued.join(", ")}.`,
                unpackaged.length !== 0 &&
                    `In the catalog but missing from themes.json: ${unpackaged.join(", ")}.`
            ]
                .filter(Boolean)
                .join(" ")
        );
    }

    return themeNames.filter(isCustomThemeName);
})();

/**
 * The fallback for an unrecognised or absent theme name. It is the first entry
 * in `themes.json`, which is also the theme keycloakify packages as primary —
 * so the theme a realm gets when it has chosen none is the same one either way.
 */
export const DEFAULT_THEME_NAME: CustomThemeName = CUSTOM_THEME_NAMES[0];

/**
 * Definitions are built once so callers get a stable reference: the login
 * shells resolve one on every render and pass it straight into `useMemo`-shaped
 * code paths.
 */
const THEME_DEFINITIONS = Object.fromEntries(
    CUSTOM_THEME_NAMES.map(name => [name, { name, ...THEME_CATALOG[name] }])
) as Record<CustomThemeName, ThemeDefinition>;

/**
 * The catalogued name for what Keycloak reported, or `undefined` when it names
 * no theme of ours — a stock Keycloak theme, or one from another JAR.
 */
export function matchThemeName(
    themeName: string | undefined
): CustomThemeName | undefined {
    const normalized = themeName?.replace(/_retrocompat$/, "");

    return normalized !== undefined && isCustomThemeName(normalized)
        ? normalized
        : undefined;
}

export function resolveThemeName(themeName: string | undefined): CustomThemeName {
    return matchThemeName(themeName) ?? DEFAULT_THEME_NAME;
}

export function getThemeDefinition(themeName: string | undefined): ThemeDefinition {
    return THEME_DEFINITIONS[resolveThemeName(themeName)];
}

export function listThemeDefinitions(): ThemeDefinition[] {
    return CUSTOM_THEME_NAMES.map(name => THEME_DEFINITIONS[name]);
}

export function getThemeLogo(
    theme: ThemeDefinition,
    mode: "light" | "dark",
    baseUrl: string
): { src: string; style: CSSProperties } | undefined {
    if (theme.logo === undefined) return undefined;

    const source = theme.logo[mode];

    return {
        src:
            source.startsWith("data:") || /^https?:\/\//.test(source)
                ? source
                : `${baseUrl}${source}`,
        style: {
            width: `${theme.logo.width}px`,
            height: `${theme.logo.height}px`,
            objectFit: "contain",
            filter: mode === "light" ? theme.logo.lightFilter : theme.logo.darkFilter
        }
    };
}

export function cloneThemeDefaults(theme: ThemeDefinition): BrandingConfig {
    return structuredClone(theme.defaultBranding);
}

export function parseThemeBrandingConfig(
    theme: ThemeDefinition,
    value: string | undefined
): BrandingConfig {
    return parseBrandingConfig(value, theme.defaultBranding);
}
