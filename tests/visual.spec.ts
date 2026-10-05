import { expect, test, type Page } from "@playwright/test";
import { openPreview, previews } from "./previews";

/**
 * Every theme in themes.json, with how to tell its mark apart from the others.
 * Each theme runs through the same previews and the same assertions, and its
 * baselines are stored under `tests/screenshots/<platform>/<theme>/`, so adding
 * a theme is one entry here. See `src/lib/branding.ts`.
 *
 * `colorSchemes` lists the schemes each theme is captured in.
 */
const themes: {
    name: string;
    colorSchemes: readonly ("light" | "dark")[];
    assertBrand: (page: Page) => Promise<void>;
}[] = [
    {
        name: "nebari",
        colorSchemes: ["light", "dark"],
        assertBrand: async page => {
            await expect(page.locator(".nebari-logo-light")).toHaveCount(1);
            await expect(page.locator(".collab-logo")).toHaveCount(0);
        }
    },
    {
        name: "collab",
        colorSchemes: ["light", "dark"],
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

test("Nebari is the default theme", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-brand", "nebari");
});

for (const theme of themes) {
    test.describe(`${theme.name} theme`, () => {
        // Light captures are named `<preview>.png` and dark ones `<preview>-dark.png`.
        for (const colorScheme of theme.colorSchemes) {
            const dark = colorScheme === "dark";

            for (const preview of previews) {
                test(dark ? `dark ${preview} page` : `${preview} page`, async ({ page }) => {
                    if (dark) {
                        await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
                    }
                    await openPreview(page, theme.name, preview);
                    await theme.assertBrand(page);
                    await expect(page.locator(".nebari-login-card")).toHaveScreenshot(
                        [theme.name, dark ? `${preview}-dark.png` : `${preview}.png`],
                        { animations: "disabled" }
                    );
                });
            }
        }

        // The captures above crop to the card. These full-page ones include the
        // page background, so they show what a deployment actually looks like —
        // they are the images shown on a release. The background glows are
        // animated, but the reduced-motion rule in theme.css stops them, keeping
        // the capture stable.
        for (const colorScheme of theme.colorSchemes) {
            test(`full ${colorScheme} page`, async ({ page }) => {
                await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
                await openPreview(page, theme.name, "login");
                await theme.assertBrand(page);
                await expect(page).toHaveScreenshot(
                    [theme.name, `full-page-${colorScheme}.png`],
                    { fullPage: true, animations: "disabled" }
                );
            });
        }
    });
}
