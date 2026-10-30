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
export const TEST_IDENTITY_PROVIDER = "a11y-sso";

/**
 * Records the setup adds so that list screens have rows and detail screens
 * exist: an empty list renders its empty state, never the table, so a table
 * that breaks on its rows goes unnoticed until someone has data.
 */
export const TEST_SUBGROUP = "a11y-subgroup";
export const TEST_IDENTITY_PROVIDER_MAPPER = "a11y-mapper";
export const TEST_CLIENT = "a11y-authz";
export const TEST_CLIENT_ROLE = "a11y-client-role";
export const TEST_AUTHORIZATION_SCOPE = "a11y-scope";
export const TEST_AUTHORIZATION_RESOURCE = "a11y-resource";
export const TEST_AUTHORIZATION_POLICY = "a11y-policy";
export const TEST_AUTHORIZATION_PERMISSION = "a11y-permission";
export const TEST_ORGANIZATION = "a11y-org";

export function realmFor(theme: string): string {
    return `a11y-${theme}`;
}

/** Where the setup project saves each theme's signed-in session. */
export function sessionFile(theme: string, surface: "admin" | "account"): string {
    return `.playwright/auth/${theme}-${surface}.json`;
}

/**
 * Uncaught errors the consoles are known to throw, each linked to the issue
 * that tracks it. As with known-violations.ts, an entry needs its issue filed
 * first.
 */
const KNOWN_PAGE_ERRORS: { message: RegExp; issue: string }[] = [
    {
        // The code editor's highlighter, rehype-prism-plus, ships Babel's
        // named-group RegExp wrapper, which assigns `exec` on a RegExp subclass;
        // oidc-spa's runtime freeze blocks that. The editor still loads,
        // highlights and saves.
        message: /Blocked alteration of window\.RegExp\.prototype\.exec/,
        issue: "https://github.com/nebari-dev/nebari-keycloak-theme/issues/83"
    }
];

/**
 * Every console test gets axe loaded before the page's own scripts: the
 * consoles freeze the runtime, which breaks injecting it afterwards.
 *
 * It also fails on any error the page leaves uncaught. A screen can throw from
 * an event handler or an effect and still look fine, so the checks that look
 * at the page would miss it.
 */
export const test = base.extend({
    context: async ({ context }, use) => {
        await preloadAxe(context);
        await use(context);
    },
    page: async ({ page }, use) => {
        const errors: string[] = [];

        page.on("pageerror", error => {
            if (!KNOWN_PAGE_ERRORS.some(known => known.message.test(error.message))) {
                errors.push(`${page.url()}: ${error.stack ?? error.message}`);
            }
        });
        await use(page);
        expect(errors, "uncaught errors in the page").toEqual([]);
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

    const { access_token, expires_in } = (await response.json()) as {
        access_token: string;
        expires_in: number;
    };

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

        await adminApi("POST", "", {
            ...representation,
            realm,
            displayName: `${theme} (accessibility tests)`
        });
    }

    await adminApi("PUT", `/${realm}`, {
        loginTheme: theme,
        accountTheme: theme,
        adminTheme: theme,
        // Sections that stay empty or hidden until switched on.
        eventsEnabled: true,
        adminEventsEnabled: true,
        adminEventsDetailsEnabled: true,
        organizationsEnabled: true
    });
    await ensureConsoleContent(realm);
}

/**
 * Returns the record `matches` picks from the list at `listPath`, creating it
 * first with a POST of `body` to `createPath` (the list path by default).
 */
async function ensureRecord<T>(
    listPath: string,
    matches: (record: T) => boolean,
    body: unknown,
    createPath = listPath
): Promise<T> {
    const find = async () => (await adminApi<T[]>("GET", listPath)).find(matches);
    const existing = await find();

    if (existing !== undefined) {
        return existing;
    }

    await adminApi("POST", createPath, body);

    return (await find())!;
}

/**
 * Switches on the parts of the consoles that stay hidden in an empty realm, so
 * they get checked: the Account Console only lists Linked accounts when the
 * realm has an identity provider, and Groups when the user may view theirs —
 * opening either by URL otherwise crashes it. The rest gives the Admin screens
 * rows to show and details to open (see the TEST_ records above).
 */
async function ensureConsoleContent(realm: string) {
    type Named = { id: string; name: string };

    await ensureRecord<{ alias: string }>(
        `/${realm}/identity-provider/instances`,
        provider => provider.alias === TEST_IDENTITY_PROVIDER,
        {
            // Never contacted: it only has to exist to be listed.
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
        }
    );
    await ensureRecord<{ name: string }>(
        `/${realm}/identity-provider/instances/${TEST_IDENTITY_PROVIDER}/mappers`,
        mapper => mapper.name === TEST_IDENTITY_PROVIDER_MAPPER,
        {
            name: TEST_IDENTITY_PROVIDER_MAPPER,
            identityProviderAlias: TEST_IDENTITY_PROVIDER,
            identityProviderMapper: "hardcoded-attribute-idp-mapper",
            config: { syncMode: "INHERIT", attribute: "department", "attribute.value": "a11y" }
        }
    );

    const group = await ensureRecord<Named>(
        `/${realm}/groups?search=${TEST_GROUP}`,
        candidate => candidate.name === TEST_GROUP,
        { name: TEST_GROUP },
        `/${realm}/groups`
    );

    await ensureRecord<Named>(
        `/${realm}/groups/${group.id}/children`,
        candidate => candidate.name === TEST_SUBGROUP,
        { name: TEST_SUBGROUP }
    );

    // A confidential client with authorization services, so the client tabs
    // only those show (credentials, service account, authorization) are there.
    const client = await ensureRecord<{ id: string; clientId: string }>(
        `/${realm}/clients?clientId=${TEST_CLIENT}`,
        candidate => candidate.clientId === TEST_CLIENT,
        {
            clientId: TEST_CLIENT,
            publicClient: false,
            serviceAccountsEnabled: true,
            authorizationServicesEnabled: true
        },
        `/${realm}/clients`
    );

    await ensureRecord<Named>(
        `/${realm}/clients/${client.id}/roles`,
        role => role.name === TEST_CLIENT_ROLE,
        { name: TEST_CLIENT_ROLE }
    );

    // Creating the client through the API skips the default resource, policy
    // and permission the console adds, so the authorization tabs get their own.
    const authorization = `/${realm}/clients/${client.id}/authz/resource-server`;

    await ensureRecord<Named>(`${authorization}/scope`, scope => scope.name === TEST_AUTHORIZATION_SCOPE, {
        name: TEST_AUTHORIZATION_SCOPE
    });

    const resource = await ensureRecord<{ _id: string; name: string }>(
        `${authorization}/resource`,
        candidate => candidate.name === TEST_AUTHORIZATION_RESOURCE,
        { name: TEST_AUTHORIZATION_RESOURCE, scopes: [{ name: TEST_AUTHORIZATION_SCOPE }] }
    );
    const [user] = await adminApi<{ id: string }[]>(
        "GET",
        `/${realm}/users?username=${ACCOUNT_USER.username}&exact=true`
    );
    // Policies and permissions share one list.
    const policy = await ensureRecord<Named>(
        `${authorization}/policy`,
        candidate => candidate.name === TEST_AUTHORIZATION_POLICY,
        { name: TEST_AUTHORIZATION_POLICY, users: [user.id] },
        `${authorization}/policy/user`
    );

    await ensureRecord<Named>(
        `${authorization}/policy`,
        candidate => candidate.name === TEST_AUTHORIZATION_PERMISSION,
        { name: TEST_AUTHORIZATION_PERMISSION, resources: [resource._id], policies: [policy.id] },
        `${authorization}/permission/resource`
    );
    await ensureRecord<Named>(
        `/${realm}/organizations?search=${TEST_ORGANIZATION}`,
        organization => organization.name === TEST_ORGANIZATION,
        { name: TEST_ORGANIZATION, domains: [{ name: "a11y.example.invalid" }] },
        `/${realm}/organizations`
    );

    const [accountClient] = await adminApi<{ id: string }[]>("GET", `/${realm}/clients?clientId=account`);
    const viewGroups = await adminApi<object>(
        "GET",
        `/${realm}/clients/${accountClient.id}/roles/view-groups`
    );

    // Both calls are idempotent.
    await adminApi("POST", `/${realm}/users/${user.id}/role-mappings/clients/${accountClient.id}`, [
        viewGroups
    ]);
    await adminApi("PUT", `/${realm}/users/${user.id}/groups/${group.id}`);

    // A linked account, so the user's Identity provider links list has a row.
    await ensureRecord<{ identityProvider: string }>(
        `/${realm}/users/${user.id}/federated-identity`,
        link => link.identityProvider === TEST_IDENTITY_PROVIDER,
        { identityProvider: TEST_IDENTITY_PROVIDER, userId: "a11y-demo", userName: ACCOUNT_USER.username },
        `/${realm}/users/${user.id}/federated-identity/${TEST_IDENTITY_PROVIDER}`
    );
}

/**
 * Fills the Keycloak sign-in page, whichever theme renders it. With
 * organizations on, the realm asks for the username first and the password on
 * a second page.
 */
export async function signIn(page: Page, user: { username: string; password: string }) {
    await page.locator("#username").fill(user.username);

    if (!(await page.locator("#password").isVisible())) {
        await page.locator("#kc-login").click();
    }

    await page.locator("#password").fill(user.password);
    await page.locator("#kc-login").click();
}

/**
 * Waits until a console screen has finished loading: the right console is
 * mounted, data requests have settled, spinners are gone and fonts are in, so
 * contrast is measured against what a user actually sees.
 */
export async function waitForConsole(page: Page, themeType: "admin" | "account", where = "the screen") {
    const crashed = `${where}: no main area, so the console crashed`;

    await expect(page.locator("html")).toHaveAttribute("data-kc-theme-type", themeType, { timeout: 30_000 });
    await expect(page.getByRole("main"), crashed).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("progressbar")).toHaveCount(0, { timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    // Again, now the data is in: a screen that crashes rendering it is
    // replaced by the console's error page, which has no main area but passes
    // every other check here.
    await expect(page.getByRole("main"), crashed).toBeVisible();
}

/**
 * The consoles scroll inside their main area; the window itself never should.
 * Something positioned against the page instead (a hidden file input or a
 * switch's native input, before the main area became their containing block)
 * stretches the document, and scrolling the window then shows bare background
 * below the console.
 */
export async function expectOnlyMainScrolls(page: Page) {
    const { documentHeight, windowHeight } = await page.evaluate(() => ({
        documentHeight: document.documentElement.scrollHeight,
        windowHeight: window.innerHeight
    }));

    expect(documentHeight, "the window scrolls past the console").toBeLessThanOrEqual(windowHeight);
}
