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
        await expect(page.locator(".nebari-logo-light")).toHaveCount(1);
        await expect(page.locator(".collab-logo")).toHaveCount(0);
        await expect(theme).toHaveScreenshot(`${preview}.png`, { animations: "disabled" });
    });
}

test("Nebari is the default brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-brand", "nebari");
    await expect(page.locator(".nebari-logo-light")).toHaveCount(1);
    await expect(page.locator(".collab-logo")).toHaveCount(0);
});

// The `openteams` brand flag swaps the mark, and nothing else — there is one
// theme and one set of layout baselines, which the captures above own. So this
// asserts the swap rather than re-photographing every page with a different
// logo in it. See `src/lib/branding.ts`.
test("the openteams brand flag swaps in the Collab lockup", async ({ page }) => {
    await page.goto("/?preview=login-providers&brand=openteams");
    await expect(page.locator("html")).toHaveAttribute("data-brand", "openteams");
    await expect(page.locator(".nebari-login-card")).toBeVisible();
    await expect(page.getByRole("img", { name: "Collab" })).toBeVisible();
    await expect(page.locator(".nebari-logo")).toHaveCount(0);
    await expect
        .poll(() =>
            page
                .locator(".collab-logo-symbol")
                .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)
        )
        .toBe(true);
});

// The captures above crop to the card. This full-page one includes the page
// background, so it shows what a deployment actually looks like — it is the
// image attached to a release. The background glows are animated, but the
// reduced-motion rule in theme.css stops them, keeping the capture stable.
test("full light page", async ({ page }) => {
    await page.goto("/?preview=login");
    await expect(page.locator(".nebari-login-card")).toBeVisible();
    await expect(page).toHaveScreenshot("full-page-light.png", {
        fullPage: true,
        animations: "disabled"
    });
});
