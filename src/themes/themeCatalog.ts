import type { CSSProperties } from "react";
import {
    DEFAULT_BRANDING_CONFIG,
    parseBrandingConfig,
    type BrandingConfig
} from "../branding/brandingConfig";

export const CUSTOM_THEME_NAMES = ["nebari"] as const;

export type CustomThemeName = (typeof CUSTOM_THEME_NAMES)[number];
export type BrandingMessageKey = "nebariBrandingConfig";

export type ThemeDefinition = {
    name: CustomThemeName;
    displayName: string;
    brandingMessageKey: BrandingMessageKey;
    defaultBranding: BrandingConfig;
    logo: {
        light: string;
        dark: string;
        width: number;
        height: number;
        lightFilter?: string;
        darkFilter?: string;
    };
    source: {
        homepage: string;
        logo: string;
    };
};

const THEME_CATALOG: Record<CustomThemeName, ThemeDefinition> = {
    nebari: {
        name: "nebari",
        displayName: "Nebari",
        brandingMessageKey: "nebariBrandingConfig",
        defaultBranding: DEFAULT_BRANDING_CONFIG,
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

export function resolveThemeName(themeName: string | undefined): CustomThemeName {
    const normalized = themeName?.replace(/_retrocompat$/, "");

    return CUSTOM_THEME_NAMES.find(name => name === normalized) ?? "nebari";
}

export function getThemeDefinition(themeName: string | undefined): ThemeDefinition {
    return THEME_CATALOG[resolveThemeName(themeName)];
}

export function getThemeLogo(
    theme: ThemeDefinition,
    mode: "light" | "dark",
    baseUrl: string
): { src: string; style: CSSProperties } {
    const source = theme.logo[mode];

    return {
        src: source.startsWith("data:") || /^https?:\/\//.test(source)
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
