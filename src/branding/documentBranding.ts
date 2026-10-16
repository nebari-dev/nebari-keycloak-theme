/**
 * Branding that lives on the document rather than inside a page component: the
 * browser-tab icon, and the Admin Console's welcome-tab mark.
 *
 * Both values have been through `normalizeBrandingConfig`, so each is empty, an
 * HTTPS URL, or a PNG, JPEG or WebP data URI. They are still only ever assigned
 * as a link's `href` or as a quoted CSS string, never parsed as markup.
 */

/** Point the page's icon links at a realm's favicon. Empty leaves them alone. */
export function applyBrandingFavicon(favicon: string): void {
    if (favicon === "") return;

    const links = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');

    if (links.length === 0) {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = favicon;
        document.head.append(link);
        return;
    }

    for (const link of links) {
        link.removeAttribute("type");
        link.href = favicon;
    }
}

/**
 * Swap the mark on the Admin Console's welcome tab.
 *
 * Upstream's vendored `Dashboard.tsx` renders it from an imported asset, and
 * owning that file for one image would cost a merge on every Keycloak upgrade.
 * A CSS `content` replacement in `src/admin/index.css` reads this property
 * instead. `JSON.stringify` quotes the value as a CSS string.
 */
export function applyBrandingDashboardMark(mark: string): void {
    const root = document.documentElement;

    if (mark === "") {
        root.style.removeProperty("--branding-dashboard-mark");
        delete root.dataset.brandingDashboardMark;
        return;
    }

    root.style.setProperty("--branding-dashboard-mark", `url(${JSON.stringify(mark)})`);
    root.dataset.brandingDashboardMark = "";
}
