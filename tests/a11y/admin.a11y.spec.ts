import type { Locator, Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { TEST_GROUP, adminApi, expect, realmFor, sessionFile, test, waitForConsole } from "./consoles";
import { expectKeyboardAccessible, tabThrough } from "./keyboard";
import { knownViolationsFor, type A11yTarget } from "./known-violations";
import { colorSchemes, themes } from "./themes";

/**
 * Admin Console accessibility, on the screens administrators use most: users,
 * roles, groups, clients, realm settings and authentication. Each runs in every
 * theme, in its own realm (see consoles.ts).
 *
 * The scans are WCAG 2.2 AA only. The console's markup is vendored from
 * Keycloak, so axe's best-practice rules would mostly report upstream choices
 * this theme can't change without owning files.
 *
 * The keyboard checks run once per theme, in the light scheme. They compare an
 * element's focused and unfocused styles and follow the Tab order, neither of
 * which a colour scheme changes; the axe scans, which do depend on colour, run
 * in both.
 */

/** Records the detail screens open, looked up per realm. */
type Records = { user: string; role: string; client: string; group: string; clientScope: string };

type Screen = { name: string; route: (records: Records) => string };

const screens: Screen[] = [
    { name: "dashboard", route: () => "" },

    // Users
    { name: "user list", route: () => "users" },
    { name: "create user", route: () => "users/add-user" },
    { name: "user details", route: r => `users/${r.user}/settings` },
    { name: "user credentials", route: r => `users/${r.user}/credentials` },
    { name: "user role mapping", route: r => `users/${r.user}/role-mapping` },
    { name: "user groups", route: r => `users/${r.user}/groups` },
    { name: "user sessions", route: r => `users/${r.user}/sessions` },

    // Roles
    { name: "realm role list", route: () => "roles" },
    { name: "create realm role", route: () => "roles/new" },
    { name: "realm role details", route: r => `roles/${r.role}/details` },
    { name: "users in role", route: r => `roles/${r.role}/users-in-role` },

    // Groups
    { name: "group list", route: () => "groups" },
    { name: "group members", route: r => `groups/${r.group}` },

    // Clients
    { name: "client list", route: () => "clients" },
    { name: "create client", route: () => "clients/add-client" },
    { name: "client settings", route: r => `clients/${r.client}/settings` },
    { name: "client roles", route: r => `clients/${r.client}/roles` },
    { name: "client scopes of a client", route: r => `clients/${r.client}/clientScopes` },
    { name: "client scope list", route: () => "client-scopes" },
    { name: "client scope details", route: r => `client-scopes/${r.clientScope}/settings` },

    // Realm settings
    { name: "realm settings: general", route: () => "realm-settings/general" },
    { name: "realm settings: login", route: () => "realm-settings/login" },
    { name: "realm settings: email", route: () => "realm-settings/email" },
    { name: "realm settings: themes", route: () => "realm-settings/themes" },
    { name: "realm settings: keys", route: () => "realm-settings/keys" },
    { name: "realm settings: sessions", route: () => "realm-settings/sessions" },
    { name: "realm settings: tokens", route: () => "realm-settings/tokens" },
    { name: "realm settings: security defenses", route: () => "realm-settings/security-defenses" },
    { name: "realm settings: user profile", route: () => "realm-settings/user-profile" },

    // Authentication and federation
    { name: "authentication flows", route: () => "authentication" },
    { name: "required actions", route: () => "authentication/required-actions" },
    { name: "authentication policies", route: () => "authentication/policies" },
    { name: "identity providers", route: () => "identity-providers" },
    { name: "user federation", route: () => "user-federation" },

    // Monitoring
    { name: "sessions", route: () => "sessions" },
    { name: "events", route: () => "events" }
];

async function lookUpRecords(realm: string): Promise<Records> {
    const [users, role, clients, groups, clientScopes] = await Promise.all([
        adminApi<{ id: string }[]>("GET", `/${realm}/users?username=demo&exact=true`),
        adminApi<{ id: string }>("GET", `/${realm}/roles/user`),
        adminApi<{ id: string }[]>("GET", `/${realm}/clients?clientId=account`),
        adminApi<{ id: string; name: string }[]>("GET", `/${realm}/groups?search=${TEST_GROUP}`),
        adminApi<{ id: string; name: string }[]>("GET", `/${realm}/client-scopes`)
    ]);

    return {
        user: users[0].id,
        role: role.id,
        client: clients[0].id,
        group: groups.find(group => group.name === TEST_GROUP)!.id,
        clientScope: clientScopes.find(scope => scope.name === "profile")!.id
    };
}

async function openScreen(page: Page, realm: string, route: string) {
    await page.goto(`/admin/${realm}/console/#/${realm}/${route}`);
    await waitForConsole(page, "admin");
    // A route the console doesn't know renders an error page rather than
    // failing, and scanning that would prove nothing.
    await expect(page.getByText(/page not found/i)).toHaveCount(0);
}

/**
 * WCAG 2.1.1, 2.1.2 and 2.4.3: a modal dialog opens from the keyboard, takes
 * focus, holds it while open, closes on Escape and hands focus back.
 */
async function expectDialogAccessible(page: Page, target: A11yTarget, trigger: Locator) {
    await trigger.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");

    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await expectNoAxeViolations(page, target, { include: "[role=dialog]" });

    const { stops } = await tabThrough(page, target);
    const escaped = await dialog.evaluate(
        (element, keys) => keys.filter(key => !element.contains(document.querySelector(`[data-a11y-key="${key}"]`))),
        stops.map(stop => stop.key)
    );

    expect(escaped, "Tab left the open dialog").toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
}

/** Rule id for a menu toggle that doesn't report whether its menu is open. */
const MENU_STATE_RULE = "menu-expanded-state";

/**
 * WCAG 2.1.1 and 4.1.2: a menu opens from the keyboard, reports that it's
 * open, lets the arrow keys reach its items, and closes on Escape.
 */
async function expectMenuAccessible(page: Page, target: A11yTarget, toggle: Locator) {
    const excusedSelectors = knownViolationsFor(target)
        .filter(violation => violation.rule === MENU_STATE_RULE)
        .map(violation => violation.selector!);
    const reportsState = !(await toggle.evaluate(
        (element, selectors) => selectors.some(selector => element.matches(selector)),
        excusedSelectors
    ));

    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu").or(page.getByRole("listbox")).first()).toBeVisible();

    if (reportsState) {
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
    }

    await page.keyboard.press("ArrowDown");
    await expect
        .poll(() =>
            page.evaluate(() => {
                const role = document.activeElement?.getAttribute("role") ?? "";

                return role.startsWith("menuitem") || role === "option";
            })
        )
        .toBe(true);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu").or(page.getByRole("listbox"))).toHaveCount(0);
    await expect(toggle).toBeFocused();

    if (reportsState) {
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
    }
}

for (const theme of themes) {
    const realm = realmFor(theme);
    const target = { surface: "admin", theme } as const;

    test.describe(`${theme} admin`, () => {
        test.use({ storageState: sessionFile(theme, "admin") });

        let records: Records;

        test.beforeAll(async () => {
            records = await lookUpRecords(realm);
        });

        for (const colorScheme of colorSchemes) {
            test.describe(`${colorScheme} scheme`, () => {
                test.use({ colorScheme });

                for (const screen of screens) {
                    test(`${screen.name}: no WCAG 2.2 AA violations`, async ({ page }) => {
                        await openScreen(page, realm, screen.route(records));
                        await expect(page.locator("html")).toHaveAttribute("data-brand", theme);
                        await expectNoAxeViolations(page, target);
                    });
                }
            });
        }

        test.describe("keyboard", () => {
            // Every screen is walked with Tab and Shift+Tab. A long table page
            // has a few hundred stops, which takes a while.
            test.slow();

            for (const screen of screens) {
                test(`${screen.name}: operable by keyboard alone`, async ({ page }) => {
                    await openScreen(page, realm, screen.route(records));
                    await expectKeyboardAccessible(page, target);
                });
            }

            test("create group dialog takes, contains and returns focus", async ({ page }) => {
                await openScreen(page, realm, "groups");
                await expectDialogAccessible(page, target, page.getByRole("button", { name: /create group/i }).first());
            });

            test("reset password dialog takes, contains and returns focus", async ({ page }) => {
                await openScreen(page, realm, `users/${records.user}/credentials`);
                await expectDialogAccessible(page, target, page.getByRole("button", { name: /reset password/i }).first());
            });

            test("masthead menu opens, navigates and closes by keyboard", async ({ page }) => {
                await openScreen(page, realm, "");
                // Anchored on aria-haspopup, which stays put, not on
                // aria-expanded, which the toggle flips as it opens.
                await expectMenuAccessible(
                    page,
                    target,
                    page.getByRole("banner").locator("[aria-haspopup]:visible").first()
                );
            });

            test("user action menu opens, navigates and closes by keyboard", async ({ page }) => {
                await openScreen(page, realm, `users/${records.user}/settings`);
                await expectMenuAccessible(
                    page,
                    target,
                    page.getByRole("main").getByRole("button", { name: "Action", exact: true })
                );
            });
        });
    });
}
