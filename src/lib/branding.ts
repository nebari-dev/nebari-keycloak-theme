/**
 * Which logo each theme brands its pages with.
 *
 * This repository ships two Keycloak themes, `nebari` and `collab` (OpenTeams
 * Collab, formerly `openteams`). They share one build and one stylesheet — the
 * Collab palette, typography and lockup are the `data-brand="collab"` rules in
 * `src/theme.css` — so the brand is simply the theme Keycloak is rendering:
 * `kcContext.themeName`. Each theme is packaged
 * into its own JAR by `scripts/build-keycloak-themes.mjs` (see themes.json).
 *
 * The standalone dev preview picks a theme with `?theme=collab`. Keycloak never
 * sends that query string, so it cannot change how a deployed theme renders.
 *
 * Logo paths are relative to `public/`, resolved against BASE_URL so they work
 * under Keycloak's themed resource path as well as the standalone dev server.
 */
export type BrandName = "nebari" | "collab";

const brandLogos: Record<BrandName, { light: string; dark: string }> = {
    nebari: {
        light: "logo/nebari-logo-light.svg",
        dark: "logo/nebari-logo-dark.svg"
    },
    // The symbol is the only part of the Collab mark available as an asset:
    // Collab ships its wordmark solely as navy artwork for light grounds. Rather
    // than flatten the shipped lockup to monochrome — what the Collab desktop app
    // does on dark surfaces — the login page and the Admin masthead set "Collab"
    // as live text beside this symbol, so the symbol keeps its four brand
    // colours. See `Template.tsx`.
    //
    // Those colours read on any ground, so both entries point at the one file.
    // That also keeps the mark visible if a console's JS dark-mode flag ever
    // disagrees with what the CSS actually painted.
    collab: {
        light: "logo/collab-symbol.png",
        dark: "logo/collab-symbol.png"
    }
};

const fallbackBrand: BrandName = "nebari";

export function isBrandName(value: unknown): value is BrandName {
    return value === "nebari" || value === "collab";
}

/**
 * The brand the document is currently rendering. `src/main.tsx` stamps the theme
 * name onto <html> for every theme type, so it is readable from the login page
 * and from the Admin and Account consoles alike, and CSS can key off it too.
 */
export function getBrandName(): BrandName {
    const stamped = document.documentElement.dataset.brand;

    return isBrandName(stamped) ? stamped : fallbackBrand;
}

/** Whether the Collab lockup should be assembled in place of a plain logo. */
export function isCollabBrand(brand: BrandName = getBrandName()): boolean {
    return brand === "collab";
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
