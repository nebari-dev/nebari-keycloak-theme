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
        await page.goto(`/?preview=${preview}&theme=nebari`);
        const theme = page.locator(".nebari-login-card");
        await expect(theme).toBeVisible();
        await expect(page.locator(".nebari-logo-light")).toHaveCount(1);
        await expect(page.locator(".openteams-logo")).toHaveCount(0);
        await expect(theme).toHaveScreenshot(`${preview}.png`, { animations: "disabled" });
    });
}

for (const preview of previews) {
    test(`OpenTeams ${preview} smoke test`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
        await page.goto(`/?preview=${preview}&theme=openteams`);

        await expect(page.locator("html")).toHaveAttribute(
            "data-kc-theme",
            "openteams"
        );
        await expect(page.locator(".nebari-login-card")).toBeVisible();
        await expect(page.getByRole("img", { name: "OpenTeams" })).toBeVisible();
        await expect(page.locator(".nebari-logo")).toHaveCount(0);
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
            )
        ).toBe(true);
    });
}

test("dark login page", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/?preview=login&theme=nebari");
    const theme = page.locator(".nebari-login-card");
    await expect(theme).toBeVisible();
    await expect(theme).toHaveScreenshot("login-dark.png", { animations: "disabled" });
});

test("OpenTeams login page", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/?preview=login-providers&theme=openteams");
    const theme = page.locator(".nebari-login-card");
    await expect(theme).toBeVisible();
    await expect(theme).toHaveScreenshot("openteams-login.png", {
        animations: "disabled"
    });
});

// The captures above crop to the card. These full-page ones include the page
// background, so they show what a deployment actually looks like — they are the
// images attached to a release. The background glows are animated, but the
// reduced-motion rule in theme.css stops them, keeping the capture stable.
for (const colorScheme of ["light", "dark"] as const) {
    test(`full ${colorScheme} page`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.goto("/?preview=login&theme=nebari");
        await expect(page.locator(".nebari-login-card")).toBeVisible();
        await expect(page).toHaveScreenshot(`full-page-${colorScheme}.png`, {
            fullPage: true,
            animations: "disabled"
        });
    });
}

test("OpenTeams full page", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/?preview=login-providers&theme=openteams");
    await expect(page.locator(".nebari-login-card")).toBeVisible();
    await expect(page).toHaveScreenshot("openteams-full-page.png", {
        fullPage: true,
        animations: "disabled"
    });
});

test("OpenTeams mobile layout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/?preview=login-providers&theme=openteams");
    await expect(page.locator(".nebari-login-card")).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
    ).toBe(true);
    await expect(page).toHaveScreenshot("openteams-mobile.png", {
        fullPage: true,
        animations: "disabled"
    });
});
