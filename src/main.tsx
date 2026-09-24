// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getBrandLogos } from "@/lib/branding";
import type { KcContext } from "./kc.gen";
import { KcPage } from "./kc.gen";
import { getKcContextMockForPreview } from "./login/KcContext";
import "@fontsource-variable/geist";
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
}

// Keycloak injects window.kcContext in production. The preview query is used
// only when running the standalone Vite app, including visual tests.
const searchParams = new URLSearchParams(window.location.search);
const injectedKcContext = window.kcContext as KcContext | undefined;
const previewThemeName = searchParams.get("theme");
const kcContext: KcContext =
    injectedKcContext ?? {
        ...getKcContextMockForPreview(searchParams.get("preview")),
        themeName: previewThemeName ?? "openteams"
    };

document.documentElement.dataset.kcTheme = kcContext.themeName;
/* The Admin Console's dashboard renders its hero mark from `admin/assets/icon.svg`,
   imported as a module URL inside upstream's vendored `Dashboard.tsx`. One `vite
   build` serves every theme (see `scripts/build-keycloak-themes.mjs`), so that
   import resolves to the same file whichever theme is packaged, and the mark
   cannot be swapped at build time. Publishing the active theme's symbol as a
   custom property lets CSS substitute it per theme, and keeps `branding.ts` the
   only place a logo path is written down. */
document.documentElement.style.setProperty(
    "--brand-symbol",
    `url("${getBrandLogos(kcContext.themeName).dark}")`
);
/* The theme *type* as well as its name. A theme's login styling has to be
   scoped to the login pages: this attribute is set for every theme type, so
   scoping on the name alone let the OpenTeams login card's input sizing,
   fonts and tokens apply to the Admin and Account consoles too. */
document.documentElement.dataset.kcThemeType = kcContext.themeType;

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <KcPage kcContext={kcContext} />
    </StrictMode>
);
