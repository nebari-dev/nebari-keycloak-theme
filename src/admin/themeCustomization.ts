import { getKcContext } from "./KcContext";

/**
 * Whether this Admin Console offers the **Theme customization** page.
 *
 * Two layers, checked in order:
 *
 * 1. `NEBARI_THEME_CUSTOMIZATION` — a deployment-level override. Keycloakify
 *    writes it into `theme.properties` as `${env.NEBARI_THEME_CUSTOMIZATION:}`,
 *    which Keycloak resolves from the container environment when it renders the
 *    page. Setting it in a compose file or Helm values takes effect on restart,
 *    with no rebuild and no realm change.
 * 2. `themeCustomizationDefault` — baked into the packaged theme from
 *    `ThemeDefinition.themeCustomization` (see `vite.config.ts`). Because each
 *    theme is packaged into its own JAR, a theme with no use for the editor
 *    ships without it rather than hiding it at runtime.
 *
 * The answer gates the route in `routes.tsx`, which is the single control point:
 * `LeftNav` renders nothing for a path it cannot find among the routes, so the
 * sidebar entry disappears with it and a hand-typed `#/<realm>/branding` lands
 * on the not-found page.
 *
 * This hides the editor; it does not revoke anything. The published config
 * lives in the realm's localization messages, which any holder of
 * `manage-realm` can still write through the Admin API, and the login pages go
 * on honouring whatever is already published there. Treat it as a deployment
 * deciding the page is not part of its product, not as an access control.
 */
const DISABLED = "disabled";
const ENABLED = "enabled";

/**
 * `kcContext.properties` is typed to the declared environment variables, but
 * Keycloak puts every `theme.properties` entry on it — including the build-time
 * default, which is not an environment variable.
 */
function readProperty(name: string): string {
    const { properties } = getKcContext().kcContext;

    const value = (properties as unknown as Record<string, string | undefined>)?.[
        name
    ];

    return value?.trim().toLowerCase() ?? "";
}

export function isThemeCustomizationEnabled(): boolean {
    const override = readProperty("NEBARI_THEME_CUSTOMIZATION");

    if (override === ENABLED) return true;
    if (override === DISABLED) return false;

    /* Unset, or set to something meaningless, falls through to the theme's own
       answer. Anything but an explicit "disabled" leaves the page in place, so
       a theme built before this property existed keeps its editor. */
    return readProperty("themeCustomizationDefault") !== DISABLED;
}
