import { expect, test } from "@playwright/test";

const previews = [
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

for (const preview of previews) {
    test(`${preview} page`, async ({ page }) => {
        await page.goto(`/?preview=${preview}`);
        const theme = page.locator(".nebari-login-card");
        await expect(theme).toBeVisible();
        await expect(theme).toHaveScreenshot(`${preview}.png`, { animations: "disabled" });
    });
}

test("dark login page", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/?preview=login");
    const theme = page.locator(".nebari-login-card");
    await expect(theme).toBeVisible();
    await expect(theme).toHaveScreenshot("login-dark.png", { animations: "disabled" });
});

// The captures above crop to the card. These full-page ones include the page
// background, so they show what a deployment actually looks like — they are the
// images attached to a release. The background glows are animated, but the
// reduced-motion rule in theme.css stops them, keeping the capture stable.
for (const colorScheme of ["light", "dark"] as const) {
    test(`full ${colorScheme} page`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.goto("/?preview=login");
        await expect(page.locator(".nebari-login-card")).toBeVisible();
        await expect(page).toHaveScreenshot(`full-page-${colorScheme}.png`, {
            fullPage: true,
            animations: "disabled"
        });
    });
}
