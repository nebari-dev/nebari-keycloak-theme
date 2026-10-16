import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { BRANDING_MESSAGE_KEY, type BrandingConfig } from "../../src/branding/brandingConfig";
import { exampleAdvanced, exampleBackgroundFile, exampleWithBackground } from "../fixtures/branding/example";

/**
 * Captures the Theme customization page for docs/theme-customization.md, from
 * the compose loop's `nebari` realm. The example brand is seeded through the
 * Admin API first, the way the doc describes seeding a preset, so the editor
 * opens on a published theme; the key is removed again afterwards.
 *
 * Run with `npm run docs:console-images`. Not part of CI: the consoles need a
 * real Keycloak.
 */
const realm = "nebari";
const admin = { username: "nebari-admin", password: "nebari-admin" };
const outDir = new URL("../../docs/images/theme-customization/", import.meta.url);

const config: BrandingConfig = { ...exampleWithBackground, advanced: exampleAdvanced };

function out(name: string): string {
    return fileURLToPath(new URL(`${name}.png`, outDir));
}

async function adminRequest(page: Page, method: "PUT" | "DELETE", body?: string) {
    const token = await page.request.post(`/realms/${realm}/protocol/openid-connect/token`, {
        form: { grant_type: "password", client_id: "admin-cli", ...admin }
    });
    expect(token.ok()).toBe(true);
    const { access_token } = (await token.json()) as { access_token: string };
    const response = await page.request.fetch(
        `/admin/realms/${realm}/localization/en/${BRANDING_MESSAGE_KEY}`,
        {
            method,
            headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "text/plain" },
            data: body
        }
    );
    expect(response.ok()).toBe(true);
}

function card(page: Page, title: string): Locator {
    return page
        .locator('[data-slot="card"]')
        .filter({ has: page.locator('[data-slot="card-title"]', { hasText: title }) });
}

/** A screenshot of the union of several elements, for a menu opened from a trigger. */
async function captureAround(page: Page, path: string, elements: Locator[], padding = 16) {
    const boxes = await Promise.all(elements.map(async element => (await element.boundingBox())!));
    const x = Math.max(0, Math.min(...boxes.map(box => box.x)) - padding);
    const y = Math.max(0, Math.min(...boxes.map(box => box.y)) - padding);
    const right = Math.max(...boxes.map(box => box.x + box.width)) + padding;
    const bottom = Math.max(...boxes.map(box => box.y + box.height)) + padding;
    await page.screenshot({ path, clip: { x, y, width: right - x, height: bottom - y } });
}

test("theme customization page", async ({ page }) => {
    mkdirSync(outDir, { recursive: true });
    await adminRequest(
        page,
        "PUT",
        `base64:${Buffer.from(JSON.stringify(config)).toString("base64")}`
    );

    try {
        await page.goto(`/admin/${realm}/console/#/${realm}/branding`);
        await page.locator("#username").fill(admin.username);
        await page.locator("#password").fill(admin.password);
        await page.locator("#kc-login").click();

        await expect(page.getByRole("heading", { level: 1, name: "Theme customization" })).toBeVisible();
        const preview = page.locator(".branding-preview-panel");
        await expect(preview).toBeVisible();
        await page.evaluate(() => document.fonts.ready);

        await page.screenshot({ path: out("editor") });

        // The console scrolls inside its own container, which clips anything
        // below the viewport, so the cards are captured from a tall one.
        await page.setViewportSize({ width: 1440, height: 3200 });
        await card(page, "Brand identity").screenshot({ path: out("brand-identity") });
        await card(page, "Color palette").screenshot({ path: out("color-palette") });
        await card(page, "Layout").screenshot({ path: out("layout") });
        await preview.screenshot({ path: out("preview") });

        const advanced = card(page, "Advanced settings");
        await advanced.getByRole("button", { name: "Show advanced settings" }).click();
        await expect(page.locator("#branding-advanced-settings")).toBeVisible();
        await advanced.screenshot({ path: out("advanced-settings") });

        const trigger = page.getByRole("button", { name: "Theme options" });
        await trigger.click();
        const menu = page.getByRole("menu");
        await expect(menu).toBeVisible();
        await captureAround(page, out("options-menu"), [trigger, menu]);

        await page.getByRole("menuitem", { name: /Import theme/ }).click();
        const importDialog = page.getByRole("dialog");
        await expect(importDialog).toBeVisible();
        await importDialog.screenshot({ path: out("import-dialog") });
        await page.keyboard.press("Escape");
        await expect(importDialog).toBeHidden();

        const backgrounds = page
            .locator(".branding-image-set")
            .filter({ has: page.getByRole("heading", { name: "Background images" }) });
        await backgrounds.locator('input[type="file"]').first().setInputFiles(fileURLToPath(exampleBackgroundFile));
        const cropDialog = page.getByRole("dialog");
        await expect(cropDialog).toBeVisible();
        await cropDialog.screenshot({ path: out("crop-dialog") });
        await page.keyboard.press("Escape");
        await expect(cropDialog).toBeHidden();
    } finally {
        await adminRequest(page, "DELETE");
    }
});
