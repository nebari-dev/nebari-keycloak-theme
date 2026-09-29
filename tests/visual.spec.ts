import { expect, test, type Page } from "@playwright/test";

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

/**
 * Every theme in themes.json, with how to tell its mark apart from the others.
 * Each theme runs through the same previews and the same assertions, and its
 * baselines are stored under `tests/screenshots/<platform>/<theme>/`, so adding
 * a theme is one entry here. See `src/lib/branding.ts`.
 */
const themes: {
    name: string;
    assertBrand: (page: Page) => Promise<void>;
}[] = [
    {
        name: "nebari",
        assertBrand: async page => {
            await expect(page.locator(".nebari-logo-light")).toHaveCount(1);
            await expect(page.locator(".collab-logo")).toHaveCount(0);
        }
    },
    {
        name: "collab",
        assertBrand: async page => {
            await expect(page.getByRole("img", { name: "Collab" })).toBeVisible();
            await expect(page.locator(".nebari-logo")).toHaveCount(0);
            // The symbol is a raster image; capturing before it decodes would
            // photograph an empty box and make the baseline flaky.
            await expect
                .poll(() =>
                    page
                        .locator(".collab-logo-symbol")
                        .evaluate(
                            (image: HTMLImageElement) => image.complete && image.naturalWidth > 0
                        )
                )
                .toBe(true);
        }
    }
];

async function openPreview(page: Page, theme: string, preview: string) {
    await page.goto(`/?preview=${preview}&theme=${theme}`);
    await expect(page.locator("html")).toHaveAttribute("data-brand", theme);
    await expect(page.locator(".nebari-login-card")).toBeVisible();
}

test("Nebari is the default theme", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-brand", "nebari");
});

for (const theme of themes) {
    test.describe(`${theme.name} theme`, () => {
        for (const preview of previews) {
            test(`${preview} page`, async ({ page }) => {
                await openPreview(page, theme.name, preview);
                await theme.assertBrand(page);
                await expect(page.locator(".nebari-login-card")).toHaveScreenshot(
                    [theme.name, `${preview}.png`],
                    { animations: "disabled" }
                );
            });
        }

        // The captures above crop to the card. This full-page one includes the
        // page background, so it shows what a deployment actually looks like —
        // it is the image shown on a release. The background glows are
        // animated, but the reduced-motion rule in theme.css stops them, keeping
        // the capture stable.
        test("full light page", async ({ page }) => {
            await openPreview(page, theme.name, "login");
            await theme.assertBrand(page);
            await expect(page).toHaveScreenshot([theme.name, "full-page-light.png"], {
                fullPage: true,
                animations: "disabled"
            });
        });
    });
}
