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
 * theme picker.
 */
type UseNebariThemeOptions = {
    /**
     * `false` when the realm has Dark Mode switched off (Realm settings →
     * Themes). `colorScheme.ts` forces light for that case before hydration, and
     * without this flag the hook's effect would immediately re-apply the user's
     * stored preference and undo it.
     */
    allowDark?: boolean;
};

export function useNebariTheme({ allowDark = true }: UseNebariThemeOptions = {}) {
    const { themeMode, isDarkMode, setThemeMode } = useThemePreference({
        storageKey: THEME_STORAGE_KEY
    });

    const resolvedIsDark = allowDark && isDarkMode;

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("pf-v5-theme-dark", resolvedIsDark);
        root.classList.toggle("dark", resolvedIsDark);
        root.dataset.theme = resolvedIsDark ? "dark" : "light";
        root.style.colorScheme = resolvedIsDark ? "dark" : "light";
    }, [resolvedIsDark]);

    return {
        themeMode: allowDark ? themeMode : ("light" as ThemeMode),
        isDarkMode: resolvedIsDark,
        setThemeMode,
        /** Whether the theme can be changed at all; drives the picker's presence. */
        canChangeTheme: allowDark
    };
}

export type { ThemeMode };
