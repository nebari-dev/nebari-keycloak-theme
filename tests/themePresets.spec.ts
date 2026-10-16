import { expect, test } from "@playwright/test";
import { parseThemeExport, serializeThemeExport } from "../src/themes/themePresets";
import {
    DEFAULT_BRANDING_CONFIG,
    TEMPLATE_BRANDING_CONFIG
} from "../src/branding/brandingConfig";
import type { ThemeDefinition } from "../src/themes/themeCatalog";

/*
 * `parseThemeExport` only reads `defaultBranding` off the theme, so the rest of
 * a `ThemeDefinition` is irrelevant here. Importing the real catalog would pull
 * in `themes.json`, which the test runner cannot load without an import
 * attribute.
 */
const theme = { defaultBranding: DEFAULT_BRANDING_CONFIG } as ThemeDefinition;

/**
 * Every rejected file here would otherwise import as a full set of theme
 * defaults and report success — indistinguishable, to the admin, from importing
 * a theme that happens to match the defaults. `typeof null === "object"` is what
 * let most of them through.
 */
test("rejects files that would silently import as theme defaults", () => {
    for (const text of [
        '{"nebariThemeExport":1,"config":null}',
        '{"nebariThemeExport":1,"config":[]}',
        '{"nebariThemeExport":1,"config":"nope"}',
        '{"nebariThemeExport":1,"config":{"light":null,"dark":null}}',
        '{"nebariThemeExport":1,"config":{"light":{},"dark":null}}',
        '{"light":null,"dark":null}',
        '{"light":{},"dark":null}',
        "[]",
        "null",
        '"a string"'
    ]) {
        expect(() => parseThemeExport(text, theme), text).toThrow();
    }
});

test("rejects an envelope with no format version, and a newer one", () => {
    expect(() =>
        parseThemeExport(
            JSON.stringify({ config: DEFAULT_BRANDING_CONFIG }),
            theme
        )
    ).toThrow(/not a Nebari theme export/);

    expect(() =>
        parseThemeExport(
            JSON.stringify({ nebariThemeExport: 99, config: DEFAULT_BRANDING_CONFIG }),
            theme
        )
    ).toThrow(/newer version/);
});

test("accepts a real export, round-tripping through the serializer", () => {
    const preset = parseThemeExport(
        serializeThemeExport(TEMPLATE_BRANDING_CONFIG, theme, {
            name: "Round trip",
            exportedAt: "2026-09-07"
        }),
        theme
    );

    expect(preset.name).toBe("Round trip");
    expect(preset.config.light.primary).toBe(TEMPLATE_BRANDING_CONFIG.light.primary);
    expect(preset.config.dark.primary).toBe(TEMPLATE_BRANDING_CONFIG.dark.primary);
});

test("accepts a bare config, and fills its gaps from the theme defaults", () => {
    const preset = parseThemeExport(
        JSON.stringify({
            light: { primary: "#123456" },
            dark: { primary: "#654321" }
        }),
        theme
    );

    expect(preset.name).toBe("Imported theme");
    expect(preset.config.light.primary).toBe("#123456");
    /* Untouched keys come from the theme rather than being dropped. */
    expect(preset.config.light.border).toBe(DEFAULT_BRANDING_CONFIG.light.border);
});
