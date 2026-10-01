import { readFileSync } from "node:fs";
import { expect, test as base, type Page } from "@playwright/test";
import { preloadAxe } from "./axe";
import { KEYCLOAK_URL } from "./environment";

/**
 * What the Admin and Account console suites share. Both consoles only run
 * inside Keycloak, so they drive the compose stack rather than the dev server.
 *
 * Each theme gets its own realm, `a11y-<theme>`, cloned from realm-export.json
 * with every theme type set to it. Tests never change a realm someone might be
 * using by hand, and the themes don't share state, so they can run in parallel.
 */

export { KEYCLOAK_URL };

/** Users from realm-export.json, present in every cloned realm. */
export const REALM_ADMIN = { username: "nebari-admin", password: "nebari-admin" };
export const ACCOUNT_USER = { username: "demo", password: "demo" };

/** The compose stack's master administrator, used to create the realms. */
const MASTER_ADMIN = { username: "admin", password: "admin" };

/** A group the setup creates, so the group screens have something to show. */
export const TEST_GROUP = "a11y-group";

/** A placeholder identity provider, so the Account Console lists Linked accounts. */
const TEST_IDENTITY_PROVIDER = "a11y-sso";

export function realmFor(theme: string): string {
    return `a11y-${theme}`;
}

/** Where the setup project saves each theme's signed-in session. */
export function sessionFile(theme: string, surface: "admin" | "account"): string {
    return `.playwright/auth/${theme}-${surface}.json`;
}

/**
 * Every console test gets axe loaded before the page's own scripts: the
 * consoles freeze the runtime, which breaks injecting it afterwards.
 */
export const test = base.extend({
    context: async ({ context }, use) => {
        await preloadAxe(context);
        await use(context);
    }
});

export { expect };

let cachedToken: { value: string; expires: number } | undefined;

async function masterToken(): Promise<string> {
    if (cachedToken !== undefined && cachedToken.expires > Date.now()) {
        return cachedToken.value;
    }

    let response: Response;

    try {
        response = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
            method: "POST",
            body: new URLSearchParams({ client_id: "admin-cli", grant_type: "password", ...MASTER_ADMIN })
        });
    } catch {
        throw new Error(
            `No Keycloak at ${KEYCLOAK_URL}. Start it with \`docker compose up -d --build keycloak\`, ` +
                "or point KEYCLOAK_URL at one."
        );
    }

    if (!response.ok) {
        throw new Error(`Could not get a master admin token from ${KEYCLOAK_URL}: ${response.status}`);
    }

    const { access_token, expires_in } = (await response.json()) as { access_token: string; expires_in: number };

    cachedToken = { value: access_token, expires: Date.now() + (expires_in - 10) * 1000 };

    return access_token;
}

/** Calls the admin REST API as the master administrator. */
export async function adminApi<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${KEYCLOAK_URL}/admin/realms${path}`, {
        method,
        headers: { Authorization: `Bearer ${await masterToken()}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`${method} /admin/realms${path} failed: ${response.status} ${await response.text()}`);
    }

    const text = await response.text();

    return (text === "" ? undefined : JSON.parse(text)) as T;
}

/**
 * Creates the theme's realm if it's missing and re-applies the theme, so a
 * realm edited by hand between runs is put back.
 */
export async function ensureRealm(theme: string) {
    const realm = realmFor(theme);
    const existing = await adminApi<{ realm: string }[]>("GET", "").then(realms =>
        realms.some(candidate => candidate.realm === realm)
    );

    if (!existing) {
        // Everything named after the source realm has to follow it: URLs, and
        // the default-roles composite that grants users Account Console access.
        const source = readFileSync(new URL("../../realm-export.json", import.meta.url), "utf8")
            .replaceAll("/realms/nebari/", `/realms/${realm}/`)
            .replaceAll("/admin/nebari/", `/admin/${realm}/`)
            .replaceAll("default-roles-nebari", `default-roles-${realm}`);
        const representation = JSON.parse(source) as Record<string, unknown>;

        delete representation.id;

        await adminApi("POST", "", { ...representation, realm, displayName: `${theme} (accessibility tests)` });
    }

    await adminApi("PUT", `/${realm}`, { loginTheme: theme, accountTheme: theme, adminTheme: theme });
    await ensureConsoleContent(realm);
}

/**
 * Switches on the parts of the consoles that stay hidden in an empty realm, so
 * they get checked: the Account Console only lists Linked accounts when the
 * realm has an identity provider, and Groups when the user may view theirs —
 * opening either by URL otherwise crashes it. The group also gives the Admin
 * group screens something to show.
 */
async function ensureConsoleContent(realm: string) {
    const identityProviders = await adminApi<{ alias: string }[]>("GET", `/${realm}/identity-provider/instances`);

    if (!identityProviders.some(provider => provider.alias === TEST_IDENTITY_PROVIDER)) {
        // Never contacted: it only has to exist to be listed.
        await adminApi("POST", `/${realm}/identity-provider/instances`, {
            alias: TEST_IDENTITY_PROVIDER,
            displayName: "Example SSO",
            providerId: "oidc",
            enabled: true,
            config: {
                authorizationUrl: "https://sso.example.invalid/auth",
                tokenUrl: "https://sso.example.invalid/token",
                clientId: "a11y",
                clientSecret: "a11y",
                clientAuthMethod: "client_secret_post"
            }
        });
    }

    let groups = await adminApi<{ id: string; name: string }[]>("GET", `/${realm}/groups?search=${TEST_GROUP}`);

    if (!groups.some(group => group.name === TEST_GROUP)) {
        await adminApi("POST", `/${realm}/groups`, { name: TEST_GROUP });
        groups = await adminApi("GET", `/${realm}/groups?search=${TEST_GROUP}`);
    }

    const [user] = await adminApi<{ id: string }[]>("GET", `/${realm}/users?username=${ACCOUNT_USER.username}&exact=true`);
    const [accountClient] = await adminApi<{ id: string }[]>("GET", `/${realm}/clients?clientId=account`);
    const viewGroups = await adminApi<object>("GET", `/${realm}/clients/${accountClient.id}/roles/view-groups`);

    // Both calls are idempotent.
    await adminApi("POST", `/${realm}/users/${user.id}/role-mappings/clients/${accountClient.id}`, [viewGroups]);
    await adminApi("PUT", `/${realm}/users/${user.id}/groups/${groups.find(group => group.name === TEST_GROUP)!.id}`);
}

/** Fills the Keycloak sign-in page, whichever theme renders it. */
export async function signIn(page: Page, user: { username: string; password: string }) {
    await page.locator("#username").fill(user.username);
    await page.locator("#password").fill(user.password);
    await page.locator("#kc-login").click();
}

/**
 * Waits until a console screen has finished loading: the right console is
 * mounted, data requests have settled, spinners are gone and fonts are in, so
 * contrast is measured against what a user actually sees.
 */
export async function waitForConsole(page: Page, themeType: "admin" | "account") {
    await expect(page.locator("html")).toHaveAttribute("data-kc-theme-type", themeType, { timeout: 30_000 });
    await expect(page.getByRole("main")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("progressbar")).toHaveCount(0, { timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
}
