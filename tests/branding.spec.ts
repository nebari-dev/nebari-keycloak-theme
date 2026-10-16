import { expect, test } from "@playwright/test";
import {
    DEFAULT_BRANDING_ADVANCED,
    DEFAULT_BRANDING_CONFIG,
    getBrandingImage,
    isBrandingCustomized,
    normalizeBrandingConfig,
    TEMPLATE_BRANDING_CONFIG
} from "../src/branding/brandingConfig";
import { calculateSourceCrop } from "../src/branding/imageUpload";

const LIGHT_LOGO = "https://assets.example.com/logo-light.png";
const DARK_LOGO = "https://assets.example.com/logo-dark.png";

test("migrates version 1 single images to both appearances", () => {
    const migrated = normalizeBrandingConfig(
        {
            ...TEMPLATE_BRANDING_CONFIG,
            version: 1,
            logo: LIGHT_LOGO,
            backgroundImage: "https://assets.example.com/background.jpg"
        },
        TEMPLATE_BRANDING_CONFIG
    );

    expect(migrated.version).toBe(2);
    expect(migrated.logo).toEqual({ light: LIGHT_LOGO, dark: LIGHT_LOGO });
    expect(migrated.backgroundImage).toEqual({
        light: "https://assets.example.com/background.jpg",
        dark: "https://assets.example.com/background.jpg"
    });
});

test("resolves an empty appearance from its sibling image", () => {
    const branding = normalizeBrandingConfig(
        {
            ...TEMPLATE_BRANDING_CONFIG,
            logo: { light: LIGHT_LOGO, dark: "" },
            backgroundImage: { light: "", dark: DARK_LOGO }
        },
        TEMPLATE_BRANDING_CONFIG
    );

    expect(getBrandingImage(branding.logo, "light")).toBe(LIGHT_LOGO);
    expect(getBrandingImage(branding.logo, "dark")).toBe(LIGHT_LOGO);
    expect(getBrandingImage(branding.backgroundImage, "light")).toBe(DARK_LOGO);
});

test("converts a centered rendered crop to source pixels", () => {
    const crop = calculateSourceCrop({
        imageWidth: 1000,
        imageHeight: 500,
        viewportWidth: 200,
        viewportHeight: 200,
        renderedWidth: 400,
        renderedHeight: 200,
        scale: 0.4,
        offsetX: 0,
        offsetY: 0
    });

    expect(crop).toEqual({ x: 250, y: 0, width: 500, height: 500 });
});

test("preserves crop position when the image is moved", () => {
    const crop = calculateSourceCrop({
        imageWidth: 1000,
        imageHeight: 500,
        viewportWidth: 200,
        viewportHeight: 200,
        renderedWidth: 400,
        renderedHeight: 200,
        scale: 0.4,
        offsetX: 100,
        offsetY: 0
    });

    expect(crop).toEqual({ x: 0, y: 0, width: 500, height: 500 });
});

/**
 * `consoleLogo` and `useLoginLogoInConsole` were added after realms had already
 * published. A stored config without them has to normalize to "reuse the login
 * logo", or adding the fields would have changed what those realms show.
 */
test("defaults a config published before the console logo existed to reuse", () => {
    const legacy = { ...TEMPLATE_BRANDING_CONFIG } as Record<string, unknown>;
    delete legacy.consoleLogo;
    delete legacy.useLoginLogoInConsole;

    const normalized = normalizeBrandingConfig(legacy, TEMPLATE_BRANDING_CONFIG);

    expect(normalized.useLoginLogoInConsole).toBe(true);
    expect(normalized.consoleLogo).toEqual({ light: "", dark: "" });
});

test("keeps a console logo distinct from the login logo", () => {
    const normalized = normalizeBrandingConfig(
        {
            ...TEMPLATE_BRANDING_CONFIG,
            logo: { light: LIGHT_LOGO, dark: LIGHT_LOGO },
            consoleLogo: { light: DARK_LOGO, dark: "" },
            useLoginLogoInConsole: false
        },
        TEMPLATE_BRANDING_CONFIG
    );

    expect(normalized.useLoginLogoInConsole).toBe(false);
    expect(normalized.consoleLogo.light).toBe(DARK_LOGO);
    /* An empty appearance still resolves from its sibling. */
    expect(getBrandingImage(normalized.consoleLogo, "dark")).toBe(DARK_LOGO);
});

test("drops image URLs that are not HTTPS", () => {
    const branding = normalizeBrandingConfig(
        {
            ...TEMPLATE_BRANDING_CONFIG,
            logo: { light: "http://assets.example.com/logo.png", dark: "javascript:alert(1)" },
            backgroundImage: { light: "data:image/svg+xml;base64,PHN2Zz4=", dark: LIGHT_LOGO }
        },
        TEMPLATE_BRANDING_CONFIG
    );

    expect(branding.logo).toEqual({ light: "", dark: "" });
    // SVG can carry script, so only raster data URIs are accepted.
    expect(branding.backgroundImage).toEqual({ light: "", dark: LIGHT_LOGO });
});

test.describe("advanced settings", () => {
    const defaults = DEFAULT_BRANDING_CONFIG;

    test("default to the theme's own look, so an untouched realm is unbranded", () => {
        const branding = normalizeBrandingConfig({ ...defaults, advanced: undefined }, defaults);

        expect(branding.advanced).toEqual(DEFAULT_BRANDING_ADVANCED);
        expect(isBrandingCustomized(branding, defaults)).toBe(false);
        expect(
            isBrandingCustomized(
                { ...defaults, advanced: { ...DEFAULT_BRANDING_ADVANCED, wordmark: "Example" } },
                defaults
            )
        ).toBe(true);
    });

    test("accept only allowlisted fonts and button shapes", () => {
        const branding = normalizeBrandingConfig(
            {
                ...defaults,
                advanced: {
                    font: "https://fonts.example.com/evil.css",
                    buttonShape: "border-radius: 0; background: url(x)"
                }
            },
            defaults
        );

        expect(branding.advanced.font).toBe("theme");
        expect(branding.advanced.buttonShape).toBe("theme");
    });

    test("clamp numbers and reject anything that is not a number", () => {
        const clamped = normalizeBrandingConfig(
            { ...defaults, advanced: { cardOpacity: -50, cardBlur: 9000 } },
            defaults
        ).advanced;
        const rejected = normalizeBrandingConfig(
            { ...defaults, advanced: { cardOpacity: "50%; color: red", cardBlur: Number.NaN } },
            defaults
        ).advanced;

        expect([clamped.cardOpacity, clamped.cardBlur]).toEqual([5, 40]);
        expect([rejected.cardOpacity, rejected.cardBlur]).toEqual([100, 0]);
    });

    test("keep text plain, short and free of direction overrides", () => {
        const advanced = normalizeBrandingConfig(
            {
                ...defaults,
                advanced: {
                    // U+202E reverses what follows; a wordmark could display as
                    // something other than what is stored.
                    wordmark: "\u202eAcme\u0000 and a much, much longer tail, that runs past forty chars",
                    registerTitle: "<img src=x onerror=alert(1)>"
                }
            },
            defaults
        ).advanced;

        expect(advanced.wordmark).toBe("Acme and a much, much longer tail, that");
        expect(advanced.wordmark.length).toBeLessThanOrEqual(40);
        // Kept as text: it is rendered as a React text node, never as HTML.
        expect(advanced.registerTitle).toBe("<img src=x onerror=alert(1)>");
    });

    test("hold icons to HTTPS or raster data URIs of a bounded size", () => {
        const advanced = normalizeBrandingConfig(
            {
                ...defaults,
                advanced: {
                    favicon: "http://assets.example.com/favicon.png",
                    dashboardMark: `data:image/png;base64,${"A".repeat(120_000)}`
                }
            },
            defaults
        ).advanced;

        expect(advanced.favicon).toBe("");
        expect(advanced.dashboardMark).toBe("");
        expect(
            normalizeBrandingConfig(
                { ...defaults, advanced: { favicon: "https://assets.example.com/favicon.png" } },
                defaults
            ).advanced.favicon
        ).toBe("https://assets.example.com/favicon.png");
    });
});
