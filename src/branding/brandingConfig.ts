import type { CSSProperties } from "react";

import { readableOn } from "./color";

export const BRANDING_MESSAGE_KEY = "nebariBrandingConfig";
const ENCODED_CONFIG_PREFIX = "base64:";

export type BrandingPalette = {
    primary: string;
    primaryHover: string;
    pageBackground: string;
    cardBackground: string;
    inputBackground: string;
    text: string;
    mutedText: string;
    border: string;
};

export type BrandingColorScheme = "light" | "dark" | "system";
export type BrandingLoginMode = "password-and-providers" | "providers-only";

export type BrandingConfig = {
    version: 1 | 2;
    companyName: string;
    logo: string;
    backgroundImage: string;
    cardRadius: number;
    colorScheme: BrandingColorScheme;
    loginMode: BrandingLoginMode;
    light: BrandingPalette;
    dark: BrandingPalette;
};

export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
    version: 1,
    companyName: "Nebari",
    logo: "",
    backgroundImage: "",
    cardRadius: 12,
    /* Defaults describe an unbranded realm, so they have to reproduce the
       behaviour the theme already had: follow the OS colour preference (the
       stylesheet's own `prefers-color-scheme` rules assume it), and show the
       password form alongside any social providers. */
    colorScheme: "system",
    loginMode: "password-and-providers",
    /* These are the design system's own tokens, rasterised to sRGB hex — the
       palette has to stay in #rrggbb because the wrapper's background-image
       gradient concatenates an alpha suffix onto `pageBackground`. Keeping them
       equal to the tokens means an unbranded realm renders exactly like the
       design system, and editing one colour does not drag the untouched ones
       to some other approximation. */
    light: {
        primary: "#9547c0",
        primaryHover: "#77399a",
        pageBackground: "#f8f8f8",
        cardBackground: "#ffffff",
        inputBackground: "#eeeeef",
        text: "#262628",
        mutedText: "#70707a",
        border: "#b7b7bb"
    },
    dark: {
        primary: "#b053e2",
        primaryHover: "#c575f4",
        pageBackground: "#262628",
        cardBackground: "#353538",
        inputBackground: "#353538",
        text: "#f8f8f8",
        mutedText: "#9d9da6",
        border: "#5a5a61"
    }
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i;

function safeText(value: unknown, fallback: string, maxLength: number): string {
    return typeof value === "string"
        ? value.trim().slice(0, maxLength) || fallback
        : fallback;
}

function safeColor(value: unknown, fallback: string): string {
    return typeof value === "string" && HEX_COLOR.test(value) ? value : fallback;
}

function safeImage(value: unknown): string {
    if (typeof value !== "string" || value.length > 900_000) return "";
    if (SAFE_DATA_IMAGE.test(value)) return value;

    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
        return "";
    }
}

function normalizePalette(value: unknown, fallback: BrandingPalette): BrandingPalette {
    const palette = typeof value === "object" && value !== null ? value as Partial<BrandingPalette> : {};

    return {
        primary: safeColor(palette.primary, fallback.primary),
        primaryHover: safeColor(palette.primaryHover, fallback.primaryHover),
        pageBackground: safeColor(palette.pageBackground, fallback.pageBackground),
        cardBackground: safeColor(palette.cardBackground, fallback.cardBackground),
        inputBackground: safeColor(palette.inputBackground, fallback.inputBackground),
        text: safeColor(palette.text, fallback.text),
        mutedText: safeColor(palette.mutedText, fallback.mutedText),
        border: safeColor(palette.border, fallback.border)
    };
}

export function normalizeBrandingConfig(
    value: unknown,
    defaults: BrandingConfig = DEFAULT_BRANDING_CONFIG
): BrandingConfig {
    const config = typeof value === "object" && value !== null ? value as Partial<BrandingConfig> : {};

    return {
        version: config.version === 1 || config.version === 2
            ? config.version
            : defaults.version,
        companyName: safeText(config.companyName, defaults.companyName, 80),
        logo: safeImage(config.logo),
        backgroundImage: safeImage(config.backgroundImage),
        cardRadius:
            typeof config.cardRadius === "number" && Number.isFinite(config.cardRadius)
                ? Math.min(32, Math.max(0, Math.round(config.cardRadius)))
                : defaults.cardRadius,
        colorScheme:
            config.colorScheme === "light" ||
            config.colorScheme === "dark" ||
            config.colorScheme === "system"
                ? config.colorScheme
                : defaults.colorScheme,
        loginMode:
            config.loginMode === "password-and-providers" ||
            config.loginMode === "providers-only"
                ? config.loginMode
                : defaults.loginMode,
        light: normalizePalette(config.light, defaults.light),
        dark: normalizePalette(config.dark, defaults.dark)
    };
}

export function parseBrandingConfig(
    value: string | undefined,
    defaults: BrandingConfig = DEFAULT_BRANDING_CONFIG
): BrandingConfig {
    if (!value) return structuredClone(defaults);

    try {
        const json = value.startsWith(ENCODED_CONFIG_PREFIX)
            ? decodeBase64Utf8(value.slice(ENCODED_CONFIG_PREFIX.length))
            : value;

        return normalizeBrandingConfig(JSON.parse(json), defaults);
    } catch {
        return structuredClone(defaults);
    }
}

export function serializeBrandingConfig(
    value: BrandingConfig,
    defaults: BrandingConfig = DEFAULT_BRANDING_CONFIG
): string {
    return `${ENCODED_CONFIG_PREFIX}${encodeBase64Utf8(
        JSON.stringify(normalizeBrandingConfig(value, defaults))
    )}`;
}

function encodeBase64Utf8(value: string): string {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return btoa(binary);
}

function decodeBase64Utf8(value: string): string {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));

    return new TextDecoder().decode(bytes);
}

/**
 * Whether a realm has actually branded itself, as opposed to falling back to the
 * theme's defaults.
 *
 * This gates the whole branding layer. An unbranded realm gets no inline
 * variables and no `[data-branded]` rules, so it renders exactly as the theme
 * did before branding existed — which keeps the feature from quietly restyling
 * every login page. Both sides go through `normalizeBrandingConfig` so the
 * comparison does not depend on key order or on how the config was built.
 */
export function isBrandingCustomized(
    config: BrandingConfig,
    defaults: BrandingConfig
): boolean {
    return (
        JSON.stringify(normalizeBrandingConfig(config, defaults)) !==
        JSON.stringify(normalizeBrandingConfig(defaults, defaults))
    );
}

export function getBrandingCssVariables(
    config: BrandingConfig,
    mode: "light" | "dark"
): CSSProperties {
    const palette = config[mode];

    return {
        /* Design-system tokens. These are what the components read, so setting
           them is the whole mechanism — nothing here should restyle a component
           directly. `--accent` and `--muted` intentionally share a value: the
           design system uses the first for hover surfaces and the second for
           sunken ones, and this palette has a single "input background". */
        "--background": palette.pageBackground,
        "--foreground": palette.text,
        "--card": palette.cardBackground,
        "--card-foreground": palette.text,
        "--popover": palette.cardBackground,
        "--popover-foreground": palette.text,
        "--primary": palette.primary,
        "--primary-hover": palette.primaryHover,
        "--primary-foreground": readableOn(palette.primary),
        "--secondary": palette.inputBackground,
        "--secondary-foreground": palette.text,
        "--muted": palette.inputBackground,
        "--muted-foreground": palette.mutedText,
        "--muted-foreground-strong": palette.text,
        "--accent": palette.inputBackground,
        "--accent-foreground": palette.text,
        "--border": palette.border,
        "--border-strong": palette.border,
        "--input": palette.border,
        "--ring": palette.primary,
        "--radius": `${config.cardRadius}px`,

        /* Bridge to the older login stylesheet, which names the same colours
           differently. These are aliases, not extra colours: each one mirrors a
           token above, so a branded realm recolours the class-driven login
           chrome (`.nebari-*`, and the class map `UserProfileFormFields` needs)
           as well as the components. Prefer the names above for anything new —
           when the last consumer of an alias goes, delete it here too. */
        "--nebari-purple": palette.primary,
        "--nebari-purple-dark": palette.primaryHover,
        "--accent-dark": palette.primaryHover,
        "--bg-primary": palette.pageBackground,
        "--bg-secondary": palette.cardBackground,
        "--bg-elevated": palette.inputBackground,
        "--bg-hover": palette.inputBackground,
        "--text-primary": palette.text,
        "--text-secondary": palette.text,
        "--text-muted": palette.mutedText,
        "--border-color": palette.border,
        "--border-subtle": palette.border
    } as CSSProperties;
}
