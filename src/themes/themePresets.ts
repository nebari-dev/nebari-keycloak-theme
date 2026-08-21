import {
    normalizeBrandingConfig,
    type BrandingConfig
} from "../branding/brandingConfig";
import type { ThemeDefinition } from "./themeCatalog";

/**
 * Theme presets: branding configurations that travel as files rather than realm
 * state.
 *
 * A published theme lives in the realm's localization messages, which means it
 * lives in Keycloak's database — so it survives a restart but not a fresh
 * deployment, and it is never captured in the repository. Exporting to a file
 * closes that gap: the file can be committed to `custom_themes/`, where it
 * ships with the theme and can be re-imported into any realm.
 */

/** Bumped only for a breaking change to the envelope, not to `BrandingConfig`. */
export const THEME_EXPORT_VERSION = 1;

export type ThemePreset = {
    /** Stable identifier: the preset filename, or `upload` for a picked file. */
    id: string;
    name: string;
    description: string;
    config: BrandingConfig;
    /** Bundled presets ship with the theme; uploaded ones came from the admin. */
    source: "bundled" | "upload";
};

type ThemeExportEnvelope = {
    nebariThemeExport: number;
    name: string;
    description: string;
    exportedAt: string;
    themeName: string;
    config: BrandingConfig;
};

/**
 * The exported file is an envelope rather than a bare `BrandingConfig` so it can
 * carry a human-readable name into the import dialog's list. `parseThemeExport`
 * still accepts a bare config, so a hand-written file works too.
 */
export function serializeThemeExport(
    config: BrandingConfig,
    theme: ThemeDefinition,
    options: { name: string; description?: string; exportedAt: string }
): string {
    const envelope: ThemeExportEnvelope = {
        nebariThemeExport: THEME_EXPORT_VERSION,
        name: options.name,
        description: options.description ?? "",
        exportedAt: options.exportedAt,
        themeName: theme.name,
        config
    };

    return `${JSON.stringify(envelope, null, 4)}\n`;
}

/**
 * Parse an exported theme file.
 *
 * The text is untrusted — it came off an admin's disk — so the config always
 * goes through `normalizeBrandingConfig`, which clamps colours to hex, bounds
 * the radius, restricts images to safe data URIs or http(s) URLs, and fills any
 * missing field from the theme's defaults. A malformed file therefore degrades
 * to defaults instead of reaching the login page.
 *
 * Throws only when the text is not JSON at all, or is JSON of the wrong shape,
 * because those are worth telling the admin about rather than silently
 * importing a default theme.
 */
export function parseThemeExport(text: string, theme: ThemeDefinition): ThemePreset {
    let parsed: unknown;

    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error("That file is not valid JSON.");
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("That file does not contain a theme.");
    }

    const candidate = parsed as Partial<ThemeExportEnvelope> & Partial<BrandingConfig>;
    const isEnvelope = candidate.config !== undefined;

    if (isEnvelope && typeof candidate.nebariThemeExport !== "number") {
        throw new Error("That file is not a Nebari theme export.");
    }

    if (
        typeof candidate.nebariThemeExport === "number" &&
        candidate.nebariThemeExport > THEME_EXPORT_VERSION
    ) {
        throw new Error(
            `That theme was exported by a newer version of this console (format ${candidate.nebariThemeExport}).`
        );
    }

    const rawConfig = isEnvelope ? candidate.config : parsed;

    /* A bare config has to look like one, otherwise any JSON object would
       "import" as a pile of defaults. */
    if (!isEnvelope && typeof (parsed as Partial<BrandingConfig>).light !== "object") {
        throw new Error("That file does not contain a theme.");
    }

    return {
        id: "upload",
        name:
            typeof candidate.name === "string" && candidate.name.trim() !== ""
                ? candidate.name.trim().slice(0, 80)
                : "Imported theme",
        description:
            typeof candidate.description === "string"
                ? candidate.description.trim().slice(0, 200)
                : "",
        config: normalizeBrandingConfig(rawConfig, theme.defaultBranding),
        source: "upload"
    };
}

/**
 * Every `*.json` in `custom_themes/` at the project root, eagerly bundled by
 * Vite. The leading slash resolves against Vite's root, not this module.
 *
 * A glob rather than a hand-maintained list, so committing a file to that
 * directory is all it takes to offer it in the import dialog — which is the
 * workflow that makes an exported theme survive a clean deployment. The files
 * are inlined into the bundle at build time, so they ship inside the theme JAR.
 */
const PRESET_MODULES = import.meta.glob<{ default: unknown }>("/custom_themes/*.json", {
    eager: true
});

function presetIdFromPath(path: string): string {
    return path.replace(/^.*\//, "").replace(/\.json$/, "");
}

/**
 * The presets committed to `custom_themes/`, sorted by name.
 *
 * A preset file that fails to parse is skipped rather than thrown, so one bad
 * commit cannot take the whole page down; `onError` reports it. If the directory
 * is empty the dialog still offers the file picker, and the editor's "Restore
 * defaults" action still reaches the theme's built-in palette.
 */
export function getBundledPresets(
    theme: ThemeDefinition,
    onError?: (message: string) => void
): ThemePreset[] {
    const presets: ThemePreset[] = [];

    for (const [path, module] of Object.entries(PRESET_MODULES)) {
        const id = presetIdFromPath(path);

        try {
            const preset = parseThemeExport(JSON.stringify(module.default), theme);
            presets.push({ ...preset, id, source: "bundled" });
        } catch (error) {
            onError?.(
                `Preset "${id}" could not be read: ${
                    error instanceof Error ? error.message : "unknown error"
                }`
            );
        }
    }

    return presets.sort((left, right) => left.name.localeCompare(right.name));
}

/** `nebari-theme-<realm>-<date>.json`, safe for any filesystem. */
export function themeExportFileName(realm: string, exportedAt: string): string {
    const slug = realm.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    return `nebari-theme-${slug || "realm"}-${exportedAt.slice(0, 10)}.json`;
}
