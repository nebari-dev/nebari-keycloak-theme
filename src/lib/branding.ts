/**
 * Which logo each theme brands its pages with.
 *
 * This lives in one place because the three consoles ask for it in three
 * different ways — the login Template renders both variants and lets CSS pick,
 * while the Admin and Account mastheads compute one URL from a JS `isDarkMode`
 * flag. When the paths were inlined at each call site, adding a theme meant
 * finding all of them, and the OpenTeams theme shipped with the Nebari logo in
 * its Admin Console because only the login page had been updated.
 *
 * Paths are relative to `public/`, resolved against BASE_URL so they work under
 * Keycloak's themed resource path as well as the standalone dev server.
 */
const themeLogos: Record<string, { light: string; dark: string }> = {
    nebari: {
        light: "logo/nebari-logo-light.svg",
        dark: "logo/nebari-logo-dark.svg"
    },
    // The `openteams` theme brands as OpenTeams Collab, and the symbol is the
    // only part of that mark available as an asset: Collab ships its wordmark
    // solely as navy artwork for light grounds. Rather than flatten the shipped
    // lockup to monochrome — what the Collab desktop app does on dark surfaces
    // — the login page sets "Collab" as live text beside this symbol, so the
    // symbol keeps its four brand colours. See `Template.tsx`.
    //
    // Those colours read on any ground, so both entries point at the one file.
    // That also keeps the mark visible if a console's JS dark-mode flag ever
    // disagrees with what the CSS actually painted.
    openteams: {
        light: "logo/collab-symbol.png",
        dark: "logo/collab-symbol.png"
    }
};

const fallbackThemeName = "nebari";

/**
 * The theme Keycloak is currently rendering. `src/main.tsx` stamps this onto
 * <html> for every theme type, so it is readable from the Admin and Account
 * consoles, which have no `kcContext.themeName` of their own.
 */
export function getActiveThemeName(): string {
    return document.documentElement.dataset.kcTheme ?? fallbackThemeName;
}

/** Both logo variants for a theme, as URLs. */
export function getBrandLogos(themeName: string = getActiveThemeName()): {
    light: string;
    dark: string;
} {
    const logos = themeLogos[themeName] ?? themeLogos[fallbackThemeName];

    return {
        light: `${import.meta.env.BASE_URL}${logos.light}`,
        dark: `${import.meta.env.BASE_URL}${logos.dark}`
    };
}

/** The single logo URL appropriate for the given colour scheme. */
export function getBrandLogo(
    isDarkMode: boolean,
    themeName: string = getActiveThemeName()
): string {
    const logos = getBrandLogos(themeName);

    return isDarkMode ? logos.dark : logos.light;
}
