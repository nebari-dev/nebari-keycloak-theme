import { expect, test, type Page } from "@playwright/test";
import {
    DEFAULT_BRANDING_ADVANCED,
    DEFAULT_BRANDING_CONFIG,
    TEMPLATE_BRANDING_CONFIG,
    type BrandingConfig
} from "../src/branding/brandingConfig";

/**
 * Theme customization's advanced settings reach both login themes. Each check
 * reads what the browser computed, not what the config says, because the
 * settings only matter if the stylesheets and templates actually apply them.
 */
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const advanced = {
    ...DEFAULT_BRANDING_ADVANCED,
    font: "inter-tight",
    cardOpacity: 40,
    cardBlur: 12,
    buttonShape: "pill",
    buttonArrow: true,
    wordmark: "Example",
    registerTitle: "Join Example",
    favicon: PIXEL
} as const;

function preview(theme: string, page: string, branding: BrandingConfig): string {
    return `/?preview=${page}&theme=${theme}&branding=${encodeURIComponent(JSON.stringify(branding))}`;
}

async function primaryButton(page: Page) {
    return page.locator('#kc-login, button[type="submit"]').first();
}

for (const [theme, defaults, card] of [
    ["nebari", DEFAULT_BRANDING_CONFIG, ".nebari-login-card"],
    ["template", TEMPLATE_BRANDING_CONFIG, '[data-login-theme="template"] .branding-card']
] as const) {
    test.describe(`${theme} theme`, () => {
        const branding: BrandingConfig = {
            ...defaults,
            logo: { light: PIXEL, dark: PIXEL },
            advanced
        };

        test("applies the font, card, buttons, wordmark and favicon", async ({ page }) => {
            await page.goto(preview(theme, "login", branding));
            await expect(page.locator(card)).toBeVisible();

            // Wordmark as text, with the mark beside it decorative.
            await expect(page.getByText("Example", { exact: true })).toBeVisible();
            await expect(page.locator(`img[src="${PIXEL}"]`)).toHaveAttribute("alt", "");

            await expect(page.locator("h1").first()).toHaveCSS("font-family", /Inter Tight/);

            const button = await primaryButton(page);
            await expect(button).toHaveCSS("border-radius", "9999px");
            const arrow = await button.evaluate(element => getComputedStyle(element, "::after").content);
            expect(arrow).toBe('""');

            await expect(page.locator(card)).toHaveCSS("backdrop-filter", "blur(12px)");
            const fill = await page.locator(card).evaluate(element => getComputedStyle(element).backgroundColor);
            // 40% of the card colour: an alpha channel below 1.
            expect(fill).toMatch(/(rgba|color)\(.*\b0?\.4\b/);

            await expect(page.locator('link[rel~="icon"]').first()).toHaveAttribute("href", PIXEL);
        });

        test("replaces the register title", async ({ page }) => {
            await page.goto(preview(theme, "register", branding));
            await expect(page.getByRole("heading", { level: 1 })).toHaveText("Join Example");
        });

        test("leaves the theme alone when nothing advanced is set", async ({ page }) => {
            await page.goto(`/?preview=login&theme=${theme}`);
            await expect(page.locator(card)).toBeVisible();
            const root = page.locator("main").first();
            await expect(root).not.toHaveAttribute("data-button-shape", /.*/);
            await expect(root).not.toHaveAttribute("data-button-arrow", /.*/);
            await expect(root).not.toHaveAttribute("data-card-glass", /.*/);
        });
    });
}
