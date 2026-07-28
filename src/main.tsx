// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { KcContext } from "./kc.gen";
import { KcPage } from "./kc.gen";
import { getKcContextMock } from "./login/KcContext";
import "@fontsource-variable/geist";
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

// window.kcContext is declared (with the full union type) in kc.gen.tsx.
// In production Keycloak injects it before this script runs.
// In dev mode (no real context) fall back to the login mock so the dev
// preview always shows a fully-populated context — prevents HMR crashes.

/**
 * "login.ftl"                  // Sign in
 * "register.ftl"               // Sign up
 * "login-reset-password.ftl"   // Request password reset
 * "login-update-password.ftl"  // Choose a new password
 * "login-verify-email.ftl"     // Verify email
 * "login-update-profile.ftl"   // Update profile
 * "info.ftl"                   // Informational result
 * "error.ftl"                  // General error
 */
const kcContext: KcContext =
    (window.kcContext as KcContext | undefined) ??
    (getKcContextMock({ pageId: "error.ftl" }) as KcContext);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <KcPage kcContext={kcContext} />
    </StrictMode>
);
