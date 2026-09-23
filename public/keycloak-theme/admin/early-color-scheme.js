/**
 * This file has been claimed for ownership from @keycloakify/keycloak-admin-ui version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "admin/early-color-scheme.js" --public --revert
 *
 * early-color-scheme.js is a special file that will be imported in the head automatically by Keycloakify.
 * Note that this file is not loaded in Storybook or when using the Vite DEV server.
 * To test it you can use `NO_DEV_SERVER=true npx keycloakify start-keycloak`.
 *
 * This runs before the bundle, so it is the only thing standing between the user
 * and a white flash. Keep it in step with `src/admin/colorScheme.ts`, which decides
 * the same thing once React is up: same storage key, same three-way preference,
 * same classes. Stock read only `prefers-color-scheme`, so a user who had picked
 * a theme explicitly got the opposite one painted first.
 */

{
    const BACKGROUND_COLOR_DARK_MODE = "#121212";
    const BACKGROUND_COLOR_LIGHT_MODE = "#FFFFFF";
    const DARK_THEME_CLASS = "pf-v5-theme-dark";
    // Nebari's tokens key off `.dark` / `[data-theme]`; PatternFly's off its own
    // class. Both consoles run the two side by side, so both are set here.
    const NEBARI_DARK_THEME_CLASS = "dark";
    const THEME_STORAGE_KEY = "nebari-admin-theme";

    const getThemeMode = () => {
        try {
            const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

            if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
                return storedTheme;
            }
        } catch {
            // Storage can be unavailable in privacy-restricted browser contexts.
        }

        return "system";
    };

    const isDarkModeEnabled = (() => {
        keycloak_policy: {
            if (typeof kcContext === "undefined") {
                break keycloak_policy;
            }

            if (kcContext.darkMode !== false) {
                break keycloak_policy;
            }

            return false;
        }

        const themeMode = getThemeMode();

        return (
            themeMode === "dark" ||
            (themeMode === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
        );
    })();

    {
        const element = document.createElement("style");

        element.id = "root-color-scheme-style";

        element.innerHTML = `:root { color-scheme: ${isDarkModeEnabled ? "dark" : "light"}; }`;

        document.head.appendChild(element);
    }

    document.documentElement.style.backgroundColor = isDarkModeEnabled
        ? BACKGROUND_COLOR_DARK_MODE
        : BACKGROUND_COLOR_LIGHT_MODE;

    if (isDarkModeEnabled) {
        document.documentElement.classList.add(DARK_THEME_CLASS);
        document.documentElement.classList.add(NEBARI_DARK_THEME_CLASS);
    }

    document.documentElement.dataset.theme = isDarkModeEnabled ? "dark" : "light";
}
