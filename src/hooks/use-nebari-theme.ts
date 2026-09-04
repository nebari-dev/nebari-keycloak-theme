import { useEffect } from "react";
import { useThemePreference, type ThemeMode } from "@/hooks/use-theme-preference";

/**
 * The Admin and Account consoles share one theme preference, so switching in
 * either is reflected in the other.
 */
const THEME_STORAGE_KEY = "nebari-admin-theme";

/**
 * Theme state for the consoles that render PatternFly alongside Nebari
 * components.
 *
 * Both run two theming systems side by side: Nebari's tokens key off `.dark` /
 * `[data-theme]`, PatternFly's off its own `.pf-v5-theme-dark` class.
 * `useThemePreference` owns the first; this mirrors the same state onto the
 * second, so PatternFly views and design-system components never disagree about
 * which theme is active.
 *
 * `useThemePreference` must be mounted once per document — several instances
 * would compete over the `<html>` class — so a console calls this hook in its
 * header and passes `themeMode` / `setThemeMode` down to whatever renders the
 * theme picker. A realm with Dark Mode disabled does not mount this hook at all;
 * its `colorScheme.ts` manager owns the forced-light state instead.
 */
export function useNebariTheme() {
    const { themeMode, isDarkMode, setThemeMode } = useThemePreference({
        storageKey: THEME_STORAGE_KEY
    });

    /* `useThemePreference` is the sole owner of Nebari's `.dark` class. This
       effect only mirrors the resolved state to PatternFly and to the document
       metadata used by the console styles, so correctness no longer depends on
       two effects running in declaration order. */
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("pf-v5-theme-dark", isDarkMode);
        root.dataset.theme = isDarkMode ? "dark" : "light";
        root.style.colorScheme = isDarkMode ? "dark" : "light";
    }, [isDarkMode]);

    return {
        themeMode,
        isDarkMode,
        setThemeMode,
        canChangeTheme: true
    };
}

export type { ThemeMode };
