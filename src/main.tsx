import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getThemeDefinition, getThemeLogo, matchThemeName } from "./themes/themeCatalog";
import type { KcContext } from "./kc.gen";
import { KcPage } from "./kc.gen";
import { getKcContextMockForPreview } from "./login/KcContext";
import "@fontsource-variable/geist";
// The Collab theme's font. Goes with the Collab theme.
import "@fontsource-variable/inter-tight";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./theme.css";

const THEME_STORAGE_KEY = "nebari-admin-theme";

function getInitialTheme(): "light" | "dark" {
    try {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

        if (storedTheme === "light" || storedTheme === "dark") {
            return storedTheme;
        }
    } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// The Account and Admin pages save their preference under the same key.
// Applying it before React renders prevents the login page flashing light.
if (document.documentElement.dataset.theme === undefined) {
    document.documentElement.dataset.theme = getInitialTheme();

    // Without a saved light or dark preference, follow the system setting as it changes.
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        document.documentElement.dataset.theme = getInitialTheme();
    });
}

// Keycloak injects window.kcContext in production. The preview query is used
// only when running the standalone Vite app, including visual tests.
const searchParams = new URLSearchParams(window.location.search);
const injectedKcContext = window.kcContext as KcContext | undefined;
// The dev preview shows Nebari unless `?theme=` names another theme in themes.json.
const previewThemeName = matchThemeName(searchParams.get("theme") ?? undefined) ?? "nebari";
const kcContext: KcContext =
    injectedKcContext ??
    getKcContextMockForPreview(
        searchParams.get("preview"),
        previewThemeName,
        searchParams.get("branding")
    );

/* The theme Keycloak is rendering, stamped on <html> so CSS and tests can tell
   which theme a page belongs to. */
document.documentElement.dataset.brand = kcContext.themeName;
/* The theme type, so a rule can be scoped to one page type: `data-brand` is set
   for the login page and both consoles alike. */
document.documentElement.dataset.kcThemeType = kcContext.themeType;
/* The Admin Console's dashboard renders its hero mark from an asset imported by
   upstream's vendored `Dashboard.tsx`, which one build cannot swap per theme. The
   Collab rules in `theme.css` substitute this property instead. Goes with the
   Collab theme. */
const brandSymbol = getThemeLogo(
    getThemeDefinition(kcContext.themeName),
    "dark",
    import.meta.env.BASE_URL
)?.src;
if (brandSymbol !== undefined) {
    document.documentElement.style.setProperty("--brand-symbol", `url("${brandSymbol}")`);
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <KcPage kcContext={kcContext} />
    </StrictMode>
);
