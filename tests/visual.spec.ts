import { expect, test, type Page } from "@playwright/test";

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

/**
 * Every theme in themes.json, with how to tell its mark apart from the others.
 * Each theme runs through the same previews and the same assertions, and its
 * baselines are stored under `tests/screenshots/<platform>/<theme>/`, so adding
 * a theme is one entry here. See `src/themes/themeCatalog.ts`.
 *
 * `colorSchemes` lists the schemes each theme is captured in.
 */
const themes: {
    name: string;
    colorSchemes: readonly ("light" | "dark")[];
    /** The login card, which the per-page captures crop to. */
    card: string;
    assertBrand: (page: Page) => Promise<void>;
}[] = [
    {
        name: "nebari",
        colorSchemes: ["light", "dark"],
        card: ".nebari-login-card",
        assertBrand: async page => {
            await expect(page.locator(".nebari-logo-light")).toHaveCount(1);
        }
    },
    {
        // The unbranded starting point: stock shadcn components, no Nebari mark.
        name: "template",
        colorSchemes: ["light", "dark"],
        card: '[data-login-theme="template"] [data-slot="card"]',
        assertBrand: async page => {
            await expect(page.locator(".nebari-logo")).toHaveCount(0);
        }
    }
];

async function openPreview(page: Page, theme: (typeof themes)[number], preview: string) {
    await page.goto(`/?preview=${preview}&theme=${theme.name}`);
    await expect(page.locator("html")).toHaveAttribute("data-brand", theme.name);
    await expect(page.locator(theme.card).first()).toBeVisible();
}

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
                    await openPreview(page, theme, preview);
                    await theme.assertBrand(page);
                    await expect(page.locator(theme.card).first()).toHaveScreenshot(
                        [theme.name, dark ? `${preview}-dark.png` : `${preview}.png`],
                        { animations: "disabled" }
                    );
                });
            }
        }

        // The captures above crop to the card. These full-page ones include the
        // page background, so they show what a deployment actually looks like —
        // they are the images the README and docs/screenshots.md lead with. The background glows are
        // animated, but the reduced-motion rule in theme.css stops them, keeping
        // the capture stable.
        for (const colorScheme of theme.colorSchemes) {
            test(`full ${colorScheme} page`, async ({ page }) => {
                await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
                await openPreview(page, theme, "login");
                await theme.assertBrand(page);
                await expect(page).toHaveScreenshot(
                    [theme.name, `full-page-${colorScheme}.png`],
                    { fullPage: true, animations: "disabled" }
                );
            });
        }
    });
}

/* The template theme ships neutral defaults that a realm is expected to rebrand,
   so its baseline palette is checked for legibility rather than only pixels. */
test.describe("template theme defaults", () => {
    for (const colorScheme of ["light", "dark"] as const) {
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
