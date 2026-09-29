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
 *
 * `colorSchemes` lists the schemes a theme actually renders differently. Collab
 * forces `color-scheme: dark` on one deep-blue ground, so a dark capture of it
 * would only duplicate the light one; Nebari has a real dark palette, and
 * dropping its dark captures would let a dark-mode regression pass CI.
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
        colorSchemes: ["light"],
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

        if (theme.colorSchemes.includes("dark")) {
            test("dark login page", async ({ page }) => {
                await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
                await openPreview(page, theme.name, "login");
                await theme.assertBrand(page);
                await expect(page.locator(".nebari-login-card")).toHaveScreenshot(
                    [theme.name, "login-dark.png"],
                    { animations: "disabled" }
                );
            });
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
