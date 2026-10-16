import { expect, test } from "@playwright/test";
import { DEFAULT_BRANDING_CONFIG, type BrandingConfig } from "../src/branding/brandingConfig";

/**
 * A realm that publishes branding must actually recolour the Nebari login page.
 *
 * The Nebari login rules use literal colours, so the inline custom properties
 * the branding layer sets reach only the rules that read tokens; the
 * `[data-branded]` block in theme.css re-states the rest. Without it a branded
 * realm got its focus ring and nothing else, and white text on a white card.
 * The screenshot baselines cannot catch that: they only cover unbranded pages.
 */
const branding: BrandingConfig = {
    ...DEFAULT_BRANDING_CONFIG,
    companyName: "Example",
    cardRadius: 16,
    light: {
        primary: "#022791",
        primaryHover: "#1540ba",
        pageBackground: "#022791",
        cardBackground: "#16389a",
        inputBackground: "#2e4ca4",
        text: "#ffffff",
        mutedText: "#8facff",
        border: "#405cac"
    },
    dark: {
        primary: "#022791",
        primaryHover: "#1540ba",
        pageBackground: "#000f3a",
        cardBackground: "#243156",
        inputBackground: "#3a4567",
        text: "#ffffff",
        mutedText: "#8facff",
        border: "#656f88"
    }
};

function rgb(hex: string): string {
    const [red, green, blue] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
    return `rgb(${red}, ${green}, ${blue})`;
}

for (const colorScheme of ["light", "dark"] as const) {
    test(`a published palette recolours the nebari login page in ${colorScheme} mode`, async ({ page }) => {
        const palette = branding[colorScheme];
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.goto(
            `/?preview=login&theme=nebari&branding=${encodeURIComponent(JSON.stringify(branding))}`
        );

        const wrapper = page.locator(".nebari-login-wrapper");
        await expect(wrapper).toHaveAttribute("data-branded", "");
        await expect(wrapper).toHaveCSS("background-color", rgb(palette.pageBackground));
        await expect(page.locator(".nebari-login-card")).toHaveCSS("background-color", rgb(palette.cardBackground));
        await expect(page.locator(".nebari-login-card")).toHaveCSS("border-radius", "16px");
        await expect(page.locator(".nebari-title")).toHaveCSS("color", rgb(palette.text));
        await expect(page.locator("#username")).toHaveCSS("background-color", rgb(palette.inputBackground));
        await expect(page.locator("#kc-login")).toHaveCSS("background-color", rgb(palette.primary));
        // The label that rendered invisible: white text on the unbranded white card.
        await expect(page.getByText("Remember me", { exact: true })).toHaveCSS("color", rgb(palette.text));
    });
}

test("an unbranded realm keeps the Nebari login page as it is", async ({ page }) => {
    await page.goto("/?preview=login&theme=nebari");
    await expect(page.locator(".nebari-login-wrapper")).not.toHaveAttribute("data-branded", /.*/);
});
