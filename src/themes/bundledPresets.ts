import { parseThemeExport, type ThemePreset } from "./themePresets";
import type { ThemeDefinition } from "./themeCatalog";

/*
 * Kept apart from `themePresets.ts` because `import.meta.glob` is a Vite
 * construct: a module containing it cannot be loaded outside a Vite pipeline,
 * which put `parseThemeExport` — the validator every imported file passes
 * through — beyond the reach of the test suite. Everything here needs a bundler;
 * everything there is plain TypeScript.
 */

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
