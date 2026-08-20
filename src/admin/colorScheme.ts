/**
 * This file has been claimed for ownership from @keycloakify/keycloak-admin-ui version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 * 
 * $ npx keycloakify own --path "admin/colorScheme.ts" --revert
 */

import { getKcContext } from "./KcContext";

const DARK_THEME_CLASS = "pf-v5-theme-dark";
const NEBARI_DARK_THEME_CLASS = "dark";
const THEME_STORAGE_KEY = "nebari-admin-theme";

type ThemeMode = "light" | "dark" | "system";

function getThemeMode(): ThemeMode {
    try {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

        if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
            return storedTheme;
        }
    } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
    }

    return "system";
}

function setIsDarkModeEnabled(isDarkModeEnabled: boolean) {
    {
        const elementId = "root-color-scheme-style";

        // Remove the style tag that might have been added by early-color-scheme.js
        document.getElementById(elementId)?.remove();

        const element = document.createElement("style");

        element.id = elementId;

        element.innerHTML = `:root { color-scheme: ${isDarkModeEnabled ? "dark" : "light"}; }`;

        document.head.appendChild(element);
    }

    // Remove the background color that might have been set by early-color-scheme.js
    // The stylesheet should have been loaded by now.
    document.documentElement.style.removeProperty("background-color");

    {
        const { classList } = document.documentElement;

        if (isDarkModeEnabled) {
            classList.add(DARK_THEME_CLASS);
            classList.add(NEBARI_DARK_THEME_CLASS);
        } else {
            classList.remove(DARK_THEME_CLASS);
            classList.remove(NEBARI_DARK_THEME_CLASS);
        }
    }

    document.documentElement.dataset.theme = isDarkModeEnabled ? "dark" : "light";
}

export function startColorSchemeManagement() {
    const { kcContext } = getKcContext();

    // The "Dark Mode" realm configuration has been set to false
    // (Admin Console -> Realm Setting -> Themes -> Dark Mode)
    // This means that the admin don't want the UI to be render in dark mode
    // even when it's the user preference.
    if (kcContext.darkMode === false) {
        setIsDarkModeEnabled(false);
        return;
    }

    const mediaQuery_isDarkThePreferredColorScheme = window.matchMedia("(prefers-color-scheme: dark)");

    const applyThemePreference = () => {
        const themeMode = getThemeMode();
        setIsDarkModeEnabled(
            themeMode === "dark" ||
                (themeMode === "system" && mediaQuery_isDarkThePreferredColorScheme.matches)
        );
    };

    applyThemePreference();

    mediaQuery_isDarkThePreferredColorScheme.addEventListener("change", applyThemePreference);
    window.addEventListener("storage", event => {
        if (event.key === THEME_STORAGE_KEY) {
            applyThemePreference();
        }
    });
}
