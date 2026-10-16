/**
 * Support for child themes: a Keycloak theme that declares `parent=nebari` (or
 * `parent=template`) in its `theme.properties` and adds only what differs. Keycloak
 * resolves templates and resources child-first, so the child runs this theme's
 * code with its own name, but two things need this theme's cooperation:
 *
 * - `brand=<name>`: the theme name compiled into this build is always the
 *   parent's, so a child identifies itself through this property. It is stamped
 *   on <html> as `data-brand`, which is what the child's CSS scopes its rules to.
 * - `styles=<paths>`: stylesheets from the child's own resources, loaded after
 *   this theme's CSS. Keycloakify's Admin Console loader already does this; the
 *   login pages and the Account Console are done here.
 *
 * `theme.properties` is written by whoever builds the image, not by realm admins,
 * but both values are still held to a narrow shape so a typo cannot point the
 * page at an unexpected URL. See docs/theme-customization.md, "Extending with a
 * child theme".
 */

const BRAND = /^[a-z][a-z0-9-]{0,39}$/;
/* Relative, `.css`, no scheme, no leading slash and no parent-directory step. */
const STYLESHEET = /^[A-Za-z0-9][A-Za-z0-9._/-]*\.css$/;

type ThemeProperties = Record<string, string | undefined> | undefined;

/** The child theme's `brand`, or undefined when there is none or it is malformed. */
export function getChildBrand(properties: ThemeProperties): string | undefined {
    const brand = properties?.brand?.trim();

    return brand !== undefined && BRAND.test(brand) ? brand : undefined;
}

/** The child theme's `styles` entries that are safe to load, in order. */
export function getChildStylesheets(properties: ThemeProperties): string[] {
    return (properties?.styles ?? "")
        .split(/\s+/)
        .filter(path => path !== "" && STYLESHEET.test(path) && !path.split("/").includes(".."));
}

const MARKER = "data-child-theme-style";

/**
 * Load the child's stylesheets and keep them last in <head>.
 *
 * The consoles load parts of this theme's CSS lazily, after startup, and a
 * later stylesheet wins a tie in specificity. Re-appending the child's links
 * whenever another stylesheet lands keeps the child's rules winning those ties,
 * as they would in a theme Keycloak renders itself.
 */
export function loadChildStylesheets(baseUrl: string, paths: readonly string[]): void {
    if (paths.length === 0) return;

    const links = paths.map(path => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${baseUrl.replace(/\/$/, "")}/${path}`;
        link.setAttribute(MARKER, "");
        return link;
    });

    const moveToEnd = () => {
        const stylesheets = document.head.querySelectorAll('style, link[rel~="stylesheet"]');
        const last = stylesheets[stylesheets.length - 1];
        if (last !== undefined && last.hasAttribute(MARKER)) return;
        document.head.append(...links);
    };

    moveToEnd();
    new MutationObserver(moveToEnd).observe(document.head, { childList: true });
}
