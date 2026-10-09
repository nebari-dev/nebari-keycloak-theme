import type { Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { expect, realmFor, sessionFile, test, waitForConsole } from "./consoles";
import { expectKeyboardAccessible } from "./keyboard";
import { colorSchemes, themes } from "./themes";

/**
 * Account Console accessibility: every page a signed-in user can reach, in
 * every theme, in its own realm (see consoles.ts). As with the Admin Console,
 * the scans are WCAG 2.2 AA only, because the markup is vendored, and the
 * keyboard checks run once per theme because a colour scheme doesn't change
 * them.
 */

const screens = [
    { name: "personal info", path: "" },
    { name: "signing in", path: "account-security/signing-in" },
    { name: "device activity", path: "account-security/device-activity" },
    { name: "linked accounts", path: "account-security/linked-accounts" },
    { name: "applications", path: "applications" },
    { name: "groups", path: "groups" }
] as const;

async function openScreen(page: Page, realm: string, path: string) {
    await page.goto(`/realms/${realm}/account/${path}`);
    await waitForConsole(page, "account");
    await expect(page.getByText(/page not found/i)).toHaveCount(0);
}

for (const theme of themes) {
    const realm = realmFor(theme);
    const target = { surface: "account", theme } as const;

    test.describe(`${theme} account`, () => {
        test.use({ storageState: sessionFile(theme, "account") });

        for (const colorScheme of colorSchemes) {
            test.describe(`${colorScheme} scheme`, () => {
                test.use({ colorScheme });

                for (const screen of screens) {
                    test(`${screen.name}: no WCAG 2.2 AA violations`, async ({ page }) => {
                        await openScreen(page, realm, screen.path);
                        await expect(page.locator("html")).toHaveAttribute("data-brand", theme);
                        await expectNoAxeViolations(page, target);
                    });
                }
            });
        }

        for (const screen of screens) {
            test(`${screen.name}: operable by keyboard alone`, async ({ page }) => {
                await openScreen(page, realm, screen.path);
                await expectKeyboardAccessible(page, target);
            });
        }
    });
}
