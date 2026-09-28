/**
 * Which logo the pages are branded with.
 *
 * This repository ships one Keycloak theme, `nebari`. The OpenTeams Collab
 * branding used to be a second theme, but it differed from Nebari only in its
 * mark, and carrying a whole theme for that — its own JAR, its own CSS scope,
 * its own screenshot matrix — cost more than it was worth. It is now a build
 * flag:
 *
 *     VITE_BRAND=openteams npm run build
 *     VITE_BRAND=openteams npm run build-keycloak-theme
 *
 * Unset, or set to anything unrecognised, the build is Nebari-branded.
 *
 * The standalone dev preview additionally accepts `?brand=openteams`, so either
 * mark can be looked at without rebuilding. Keycloak never sends that query
 * string, so it cannot change how a deployed theme renders.
 *
 * Logo paths are relative to `public/`, resolved against BASE_URL so they work
 * under Keycloak's themed resource path as well as the standalone dev server.
 */
export type BrandName = "nebari" | "openteams";

const brandLogos: Record<BrandName, { light: string; dark: string }> = {
    nebari: {
        light: "logo/nebari-logo-light.svg",
        dark: "logo/nebari-logo-dark.svg"
    },
    // `openteams` brands as OpenTeams Collab, and the symbol is the only part of
    // that mark available as an asset: Collab ships its wordmark solely as navy
    // artwork for light grounds. Rather than flatten the shipped lockup to
    // monochrome — what the Collab desktop app does on dark surfaces — the login
    // page and the Admin masthead set "Collab" as live text beside this symbol,
    // so the symbol keeps its four brand colours. See `Template.tsx`.
    //
    // Those colours read on any ground, so both entries point at the one file.
    // That also keeps the mark visible if a console's JS dark-mode flag ever
    // disagrees with what the CSS actually painted.
    openteams: {
        light: "logo/collab-symbol.png",
        dark: "logo/collab-symbol.png"
    }
};

const fallbackBrand: BrandName = "nebari";

export function isBrandName(value: unknown): value is BrandName {
    return value === "nebari" || value === "openteams";
}

/** The brand this build was compiled for, ignoring any preview override. */
export function getConfiguredBrand(): BrandName {
    const configured = import.meta.env.VITE_BRAND;

    return isBrandName(configured) ? configured : fallbackBrand;
}

/**
 * The brand the document is currently rendering. `src/main.tsx` stamps this onto
 * <html> for every theme type, so it is readable from the login page and from
 * the Admin and Account consoles alike, and CSS can key off it too.
 */
export function getBrandName(): BrandName {
    const stamped = document.documentElement.dataset.brand;

    return isBrandName(stamped) ? stamped : getConfiguredBrand();
}

/** Whether the Collab lockup should be assembled in place of a plain logo. */
export function isCollabBrand(brand: BrandName = getBrandName()): boolean {
    return brand === "openteams";
}

/** Both logo variants for a brand, as URLs. */
export function getBrandLogos(brand: BrandName = getBrandName()): {
    light: string;
    dark: string;
} {
    const logos = brandLogos[brand] ?? brandLogos[fallbackBrand];

    return {
        light: `${import.meta.env.BASE_URL}${logos.light}`,
        dark: `${import.meta.env.BASE_URL}${logos.dark}`
    };
}

/** The single logo URL appropriate for the given colour scheme. */
export function getBrandLogo(
    isDarkMode: boolean,
    brand: BrandName = getBrandName()
): string {
    const logos = getBrandLogos(brand);

    return isDarkMode ? logos.dark : logos.light;
}
