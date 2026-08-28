import type { CSSProperties } from "react";
import {
    DEFAULT_BRANDING_CONFIG,
    TEMPLATE_BRANDING_CONFIG,
    parseBrandingConfig,
    type BrandingConfig
} from "../branding/brandingConfig";

/**
 * `template` is first because it is the fallback for an unrecognised or absent
 * theme name, and it is the theme keycloakify builds as primary.
 */
export const CUSTOM_THEME_NAMES = ["template", "nebari"] as const;

export type CustomThemeName = (typeof CUSTOM_THEME_NAMES)[number];
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

export type ThemeDefinition = {
    name: CustomThemeName;
    displayName: string;
    description: string;
    brandingMessageKey: BrandingMessageKey;
    defaultBranding: BrandingConfig;
    componentSet: ThemeComponentSet;
    /** Omitted by themes that ship no artwork of their own. */
    logo?: ThemeLogo;
    source?: {
        homepage: string;
        logo: string;
    };
};

const THEME_CATALOG: Record<CustomThemeName, ThemeDefinition> = {
    /**
     * The unbranded starting point. It carries no logo, no wordmark and no
     * accent hue on purpose — everything visible is meant to be replaced by
     * whoever deploys it, either in the Theme customization console or by
     * editing `src/login/template/`.
     */
    template: {
        name: "template",
        displayName: "Template",
        description:
            "Unbranded shadcn/ui starting point. No logo or brand colours — customize it to make it yours.",
        brandingMessageKey: "nebariBrandingConfig",
        defaultBranding: TEMPLATE_BRANDING_CONFIG,
        componentSet: "shadcn",
        source: {
            homepage: "https://ui.shadcn.com",
            logo: "https://ui.shadcn.com"
        }
    },
    nebari: {
        name: "nebari",
        displayName: "Nebari",
        description: "The Nebari design system theme, with Nebari branding.",
        brandingMessageKey: "nebariBrandingConfig",
        defaultBranding: DEFAULT_BRANDING_CONFIG,
        componentSet: "nebari",
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
};

export const DEFAULT_THEME_NAME: CustomThemeName = "template";

export function resolveThemeName(themeName: string | undefined): CustomThemeName {
    const normalized = themeName?.replace(/_retrocompat$/, "");

    return CUSTOM_THEME_NAMES.find(name => name === normalized) ?? DEFAULT_THEME_NAME;
}

export function getThemeDefinition(themeName: string | undefined): ThemeDefinition {
    return THEME_CATALOG[resolveThemeName(themeName)];
}

export function listThemeDefinitions(): ThemeDefinition[] {
    return CUSTOM_THEME_NAMES.map(name => THEME_CATALOG[name]);
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
