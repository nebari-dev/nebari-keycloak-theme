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
 * Each page component in src/login/pages/: the Keycloak page id that renders it
 * (also addressable as `?pageId=`), and the previews that show it. The
 * accessibility suite fails if a page there has no entry, so a new page can't
 * go unchecked.
 */
export const loginPages: Record<string, { pageId: string; previews: readonly Preview[] }> = {
    "Login.tsx": { pageId: "login.ftl", previews: ["login", "login-providers", "login-error"] },
    "Register.tsx": { pageId: "register.ftl", previews: ["register"] },
    "LoginResetPassword.tsx": { pageId: "login-reset-password.ftl", previews: ["forgot-password"] },
    "LoginUpdatePassword.tsx": { pageId: "login-update-password.ftl", previews: ["update-password"] },
    "LoginVerifyEmail.tsx": { pageId: "login-verify-email.ftl", previews: ["verify-email"] },
    "LoginUpdateProfile.tsx": { pageId: "login-update-profile.ftl", previews: ["update-profile"] },
    "Info.tsx": { pageId: "info.ftl", previews: ["info"] },
    "Error.tsx": { pageId: "error.ftl", previews: ["error"] }
};

/** Opens a preview in a theme and waits for the sign-in card. */
export async function openPreview(page: Page, theme: string, preview: string) {
    await page.goto(`/?preview=${preview}&theme=${theme}`);
    await expect(page.locator("html")).toHaveAttribute("data-brand", theme);
    await expect(page.locator(".nebari-login-card")).toBeVisible();
}
