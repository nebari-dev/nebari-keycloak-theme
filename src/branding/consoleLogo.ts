import { getBrandingImage } from "./brandingConfig";
import { getThemeDefinition, getThemeLogo, parseThemeBrandingConfig } from "../themes/themeCatalog";

/**
 * The mark a console masthead should show, most specific source first.
 *
 * The realm's published branding sits above the theme's own artwork: a
 * deployment that uploaded a logo in **Theme customization** means it for the
 * console too, not only the login card. Below it, a theme's catalogued artwork,
 * and below that nothing — the caller falls back to the realm's display name.
 *
 * The published config reaches a console through the realm's localization
 * messages, which its i18n already loads before first paint, so this needs no
 * fetch of its own and cannot flash.
 *
 * Which published image is used depends on `useLoginLogoInConsole`: on, the
 * login card's mark is reused; off, the console's own `consoleLogo`. The two
 * exist separately because the slots are different shapes — a masthead is short
 * and wide, a login card taller — so a mark chosen for one can sit awkwardly in
 * the other.
 */
export function getConsoleLogo(params: {
    themeName: string | undefined;
    mode: "light" | "dark";
    baseUrl: string;
    /** The raw `nebariBrandingConfig` message, however the console reads it. */
    publishedConfig: string | undefined;
}): string | undefined {
    const { themeName, mode, baseUrl, publishedConfig } = params;
    const theme = getThemeDefinition(themeName);

    /* Absent or unparseable falls back to the theme's defaults, whose logos are
       empty for every theme — so this is `""` unless a realm published one. */
    const config = parseThemeBrandingConfig(theme, publishedConfig);
    const published = getBrandingImage(
        config.useLoginLogoInConsole ? config.logo : config.consoleLogo,
        mode
    );

    return published || getThemeLogo(theme, mode, baseUrl)?.src;
}
