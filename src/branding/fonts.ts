import type { BrandingFont } from "./brandingConfig";

/**
 * Loads the self-hosted files for a branding font, once.
 *
 * Each loader is a dynamic import, so Vite emits the font's CSS and files as a
 * separate chunk inside the theme JAR and a realm only downloads the font it
 * chose. `theme` and `system` need nothing: the theme's own font is already
 * loaded, and the system font is the operating system's.
 */
const FONT_LOADERS: Partial<Record<BrandingFont, () => Promise<unknown>>> = {
    "inter-tight": () => import("@fontsource-variable/inter-tight"),
    "dm-sans": () =>
        Promise.all([
            import("@fontsource/dm-sans/400.css"),
            import("@fontsource/dm-sans/500.css"),
            import("@fontsource/dm-sans/600.css"),
            import("@fontsource/dm-sans/700.css")
        ])
};

const loaded = new Map<BrandingFont, Promise<unknown>>();

export function loadBrandingFont(font: BrandingFont): void {
    const load = FONT_LOADERS[font];

    if (load === undefined || loaded.has(font)) return;

    /* A failed load leaves the fallback in the font stack, which is a legible
       page; it is not worth surfacing to a visitor. */
    loaded.set(font, load().catch(() => undefined));
}
