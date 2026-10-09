import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ACCOUNT_USER, REALM_ADMIN, ensureRealm, expect, realmFor, sessionFile, signIn, test, waitForConsole } from "./consoles";
import { themes } from "./themes";

/**
 * Runs before the console suites: makes sure each theme's realm exists, then
 * signs in once per console and saves the session, so the tests start signed in.
 * Only cookies and local storage are saved: the consoles start a fresh
 * oidc-spa session from Keycloak's SSO cookie. Saving IndexedDB as well hands
 * oidc-spa a DPoP key Playwright can't serialise, and the console hangs loading.
 */

for (const theme of themes) {
    test.describe.serial(`${theme} realm`, () => {
        const realm = realmFor(theme);

        test("exists with the theme applied", async () => {
            await ensureRealm(theme);
        });

        test("Admin Console session", async ({ page }) => {
            await page.goto(`/admin/${realm}/console/`);
            await signIn(page, REALM_ADMIN);
            await waitForConsole(page, "admin");
            await expect(page.locator("html")).toHaveAttribute("data-brand", theme);

            mkdirSync(dirname(sessionFile(theme, "admin")), { recursive: true });
            await page.context().storageState({ path: sessionFile(theme, "admin") });
        });

        test("Account Console session", async ({ page }) => {
            await page.goto(`/realms/${realm}/account/`);
            await signIn(page, ACCOUNT_USER);
            await waitForConsole(page, "account");
            await expect(page.locator("html")).toHaveAttribute("data-brand", theme);

            mkdirSync(dirname(sessionFile(theme, "account")), { recursive: true });
            await page.context().storageState({ path: sessionFile(theme, "account") });
        });
    });
}
