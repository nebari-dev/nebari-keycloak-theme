import { expect, test } from "@playwright/test";

type Rgb = [number, number, number];

function parseRgb(value: string): Rgb {
    const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);

    if (channels?.length !== 3) throw new Error(`Expected an rgb() colour, got ${value}`);

    return channels as Rgb;
}

function relativeLuminance(value: string): number {
    const [red, green, blue] = parseRgb(value).map(channel => {
        const normalized = channel / 255;

        return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(left: string, right: string): number {
    const [lighter, darker] = [relativeLuminance(left), relativeLuminance(right)].sort(
        (first, second) => second - first
    );

    return (lighter + 0.05) / (darker + 0.05);
}

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

/* The preview mock reports a theme name that matches nothing in the catalog, so
   an unpinned preview renders whichever theme is the default. Both themes are
   pinned explicitly here so a change of default cannot silently repoint a
   baseline at different markup. */

test.describe("nebari theme", () => {
    for (const preview of previews) {
        test(`${preview} page`, async ({ page }) => {
            await page.goto(`/?preview=${preview}&theme=nebari`);
            const theme = page.locator(".nebari-login-card");
            await expect(theme).toBeVisible();
            await expect(theme).toHaveScreenshot(`${preview}.png`, {
                animations: "disabled"
            });
        });
    }

    test("dark login page", async ({ page }) => {
        await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
        await page.goto("/?preview=login&theme=nebari");
        const theme = page.locator(".nebari-login-card");
        await expect(theme).toBeVisible();
        await expect(theme).toHaveScreenshot("login-dark.png", { animations: "disabled" });
    });

    // The captures above crop to the card. These full-page ones include the page
    // background, so they show what a deployment actually looks like — they are
    // the images attached to a release. The background glows are animated, but
    // the reduced-motion rule in theme.css stops them, keeping the capture
    // stable.
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
});

test.describe("template theme", () => {
    for (const preview of previews) {
        test(`${preview} page`, async ({ page }) => {
            await page.goto(`/?preview=${preview}&theme=template`);
            const card = page.locator('[data-slot="card"]');
            await expect(card).toBeVisible();
            await expect(card).toHaveScreenshot(`template-${preview}.png`, {
                animations: "disabled"
            });
        });
    }

    for (const colorScheme of ["light", "dark"] as const) {
        test(`full ${colorScheme} page`, async ({ page }) => {
            await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
            await page.goto("/?preview=login&theme=template");
            await expect(page.locator('[data-slot="card"]')).toBeVisible();
            await expect(page).toHaveScreenshot(`template-full-page-${colorScheme}.png`, {
                fullPage: true,
                animations: "disabled"
            });
        });

        test(`${colorScheme} default contrast`, async ({ page }) => {
            await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
            await page.goto("/?preview=login&theme=template");
            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

            const surfaces = await page.locator('[data-login-theme="template"]').evaluate(root => {
                const card = root.querySelector<HTMLElement>('[data-slot="card"]');
                /* Password is not auto-focused, so this measures the resting
                   control boundary rather than the primary-coloured focus state. */
                const input = root.querySelector<HTMLElement>("#password");

                if (!card || !input) throw new Error("Template login surfaces did not render");

                const cardStyle = getComputedStyle(card);
                const inputStyle = getComputedStyle(input);
                const rootStyle = getComputedStyle(root);

                return {
                    page: rootStyle.backgroundColor,
                    card: cardStyle.backgroundColor,
                    cardBorder: cardStyle.borderColor,
                    input: inputStyle.backgroundColor,
                    inputBorder: inputStyle.borderColor
                };
            });

            expect(surfaces.page).not.toBe(surfaces.card);
            expect(surfaces.input).not.toBe(surfaces.card);
            expect(contrastRatio(surfaces.cardBorder, surfaces.page)).toBeGreaterThanOrEqual(3);
            expect(contrastRatio(surfaces.inputBorder, surfaces.input)).toBeGreaterThanOrEqual(3);
            expect(contrastRatio(surfaces.inputBorder, surfaces.card)).toBeGreaterThanOrEqual(3);

            await page.goto("/?preview=login-error&theme=template");

            const errorColors = await page.locator('[data-slot="field-error"]').evaluate(error => {
                const card = error.closest<HTMLElement>('[data-slot="card"]');

                if (!card) throw new Error("Template error card did not render");

                return {
                    text: getComputedStyle(error).color,
                    card: getComputedStyle(card).backgroundColor
                };
            });

            expect(contrastRatio(errorColors.text, errorColors.card)).toBeGreaterThanOrEqual(4.5);
        });
    }
});
