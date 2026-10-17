import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_BRANDING_ADVANCED, type BrandingConfig } from "../src/branding/brandingConfig";
import {
    exampleAdvanced as advanced,
    exampleBrand as brand,
    exampleWithBackground as withBackground
} from "./fixtures/branding/example";
import { loginCards } from "./previews";

/**
 * The images in docs/theme-customization.md. Each one renders the example
 * "Example" brand through the same `?branding=` preview the other branding
 * tests use, and is stored as a baseline under
 * `tests/screenshots/<platform>/theme-customization/`. The doc links the
 * baselines themselves, so it always shows what `main` renders, and a change
 * that alters one fails here until it is rebaselined.
 */
type Theme = "nebari" | "template";

/**
 * The config embeds its images, which makes the URL longer than the dev
 * server accepts. The page reads `?branding=` from `location`, so the browser
 * keeps the full URL while the request is answered from a short one.
 */
async function open(page: Page, theme: Theme, preview: string, branding: BrandingConfig) {
    const short = `/?preview=${preview}&theme=${theme}`;
    await page.route(
        url => url.pathname === "/" && url.searchParams.has("branding"),
        async route => route.fulfill({ response: await route.fetch({ url: short }) })
    );
    await page.goto(`${short}&branding=${encodeURIComponent(JSON.stringify(branding))}`);
    await expect(page.locator(loginCards[theme]).first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
}

function shot(name: string): string[] {
    return ["theme-customization", `${name}.png`];
}

test.describe("theme customization docs", () => {
    for (const colorScheme of ["light", "dark"] as const) {
        test(`palette and logo, ${colorScheme}`, async ({ page }) => {
            await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
            await open(page, "nebari", "login", brand);
            await expect(page).toHaveScreenshot(shot(`palette-${colorScheme}`), { animations: "disabled" });
        });
    }

    for (const [name, branding] of [
        ["advanced-off", withBackground],
        ["advanced-on", { ...withBackground, advanced }]
    ] as const) {
        test(`background image, ${name}`, async ({ page }) => {
            await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
            await open(page, "nebari", "login", branding);
            await expect(page).toHaveScreenshot(shot(name), { animations: "disabled" });
        });
    }

    test("advanced settings on the template theme", async ({ page }) => {
        await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
        await open(page, "template", "login", { ...withBackground, advanced });
        await expect(page).toHaveScreenshot(shot("template-advanced-on"), { animations: "disabled" });
    });

    for (const [name, change] of [
        ["button-theme", {}],
        ["button-rounded", { buttonShape: "rounded" }],
        ["button-pill", { buttonShape: "pill" }],
        ["button-square", { buttonShape: "square" }],
        ["button-arrow", { buttonArrow: true }]
    ] as const) {
        test(`primary button, ${name}`, async ({ page }) => {
            await open(page, "nebari", "login", {
                ...brand,
                advanced: { ...DEFAULT_BRANDING_ADVANCED, ...change }
            });
            await expect(page.locator("#kc-login")).toHaveScreenshot(shot(name), { animations: "disabled" });
        });
    }

    test("providers-only login mode", async ({ page }) => {
        await open(page, "nebari", "login-providers", { ...brand, loginMode: "providers-only" });
        await expect(page.locator(loginCards.nebari)).toHaveScreenshot(shot("providers-only"), {
            animations: "disabled"
        });
    });
});
