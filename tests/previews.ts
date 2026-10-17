import { expect, type Page } from "@playwright/test";

/**
 * Every mocked login page the dev server can render, by its `?preview=` name
 * (see `getKcContextMockForPreview` in src/login/KcContext.ts). The screenshot
 * and accessibility specs both iterate this list, so a new page is added once
 * and gets both kinds of coverage.
 */
export const previews = [
    "login",
    "login-providers",
    "login-error",
    "register",
    "forgot-password",
    "update-password",
    "verify-email",
    "update-profile",
    "info",
    "error"
] as const;

export type Preview = (typeof previews)[number];

/**
 * Each login page component and the previews that render it. Both component
 * sets, src/login/pages/ and src/login/template/pages/, use these file names.
 * The accessibility suite fails if either directory has a page with no entry,
 * so a new page can't go unchecked.
 */
export const loginPages: Record<string, readonly Preview[]> = {
    "Login.tsx": ["login", "login-providers", "login-error"],
    "Register.tsx": ["register"],
    "LoginResetPassword.tsx": ["forgot-password"],
    "LoginUpdatePassword.tsx": ["update-password"],
    "LoginVerifyEmail.tsx": ["verify-email"],
    "LoginUpdateProfile.tsx": ["update-profile"],
    "Info.tsx": ["info"],
    "Error.tsx": ["error"]
};

/** The login card in each theme in themes.json. */
export const loginCards: Record<string, string> = {
    nebari: ".nebari-login-card",
    template: '[data-login-theme="template"] [data-slot="card"]'
};

/** Opens a preview in a theme and waits for its sign-in card. */
export async function openPreview(page: Page, theme: string, preview: string) {
    await page.goto(`/?preview=${preview}&theme=${theme}`);
    await expect(page.locator("html")).toHaveAttribute("data-brand", theme);
    await expect(page.locator(loginCards[theme]).first()).toBeVisible();
}
