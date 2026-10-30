import type { Page } from "@playwright/test";
import {
    ACCOUNT_USER,
    TEST_AUTHORIZATION_PERMISSION,
    TEST_AUTHORIZATION_POLICY,
    TEST_AUTHORIZATION_RESOURCE,
    TEST_AUTHORIZATION_SCOPE,
    TEST_CLIENT,
    TEST_CLIENT_ROLE,
    TEST_GROUP,
    TEST_IDENTITY_PROVIDER,
    TEST_IDENTITY_PROVIDER_MAPPER,
    TEST_ORGANIZATION,
    TEST_SUBGROUP,
    adminApi,
    expect,
    realmFor,
    sessionFile,
    test,
    waitForConsole
} from "../a11y/consoles";

/**
 * Admin Console smoke test: opens every screen and clicks through every tab,
 * nested tabs included, checking only that the console survives. The
 * accessibility suite checks fewer screens much more closely; this one is
 * wide and shallow, for the case it can't see: a vendored screen that hands
 * our replacement components something they don't expect and crashes the
 * console.
 *
 * It runs in one theme. The Admin Console's code is the same in every theme;
 * only the styles and the catalog entry differ.
 */

const THEME = "nebari";
const realm = realmFor(THEME);

type Records = {
    user: string;
    realmRole: string;
    group: string;
    subgroup: string;
    client: string;
    clientRole: string;
    clientScope: string;
    clientScopeMapper: string;
    identityProviderMapper: string;
    organization: string;
    browserFlow: string;
    keyProvider: { id: string; providerId: string };
    authorization: {
        resource: string;
        scope: string;
        policy: { id: string; type: string };
        permission: { id: string; type: string };
    };
};

type Screen = { name: string; route: (records: Records) => string };

const screens: Screen[] = [
    { name: "dashboard", route: () => "" },

    // Users
    { name: "user list", route: () => "users" },
    { name: "create user", route: () => "users/add-user" },
    { name: "user", route: r => `users/${r.user}/settings` },

    // Roles
    { name: "realm role list", route: () => "roles" },
    { name: "create realm role", route: () => "roles/new" },
    { name: "realm role", route: r => `roles/${r.realmRole}/details` },

    // Groups
    { name: "group list", route: () => "groups" },
    { name: "group", route: r => `groups/${r.group}` },
    { name: "subgroup", route: r => `groups/${r.group}/${r.subgroup}` },

    // Clients
    { name: "client list", route: () => "clients" },
    { name: "create client", route: () => "clients/add-client" },
    { name: "import client", route: () => "clients/import-client" },
    { name: "create initial access token", route: () => "clients/initialAccessToken/create" },
    { name: "client", route: r => `clients/${r.client}/settings` },
    { name: "client role", route: r => `clients/${r.client}/roles/${r.clientRole}/details` },
    { name: "create client role", route: r => `clients/${r.client}/roles/new` },
    { name: "dedicated client scope", route: r => `clients/${r.client}/clientScopes/dedicated` },
    {
        name: "authorization resource",
        route: r => `clients/${r.client}/authorization/resource/${r.authorization.resource}`
    },
    { name: "create authorization resource", route: r => `clients/${r.client}/authorization/resource/new` },
    {
        name: "authorization scope",
        route: r => `clients/${r.client}/authorization/scope/${r.authorization.scope}`
    },
    { name: "create authorization scope", route: r => `clients/${r.client}/authorization/scope/new` },
    {
        name: "authorization policy",
        route: r =>
            `clients/${r.client}/authorization/policy/${r.authorization.policy.id}/${r.authorization.policy.type}`
    },
    {
        name: "authorization permission",
        route: r =>
            `clients/${r.client}/authorization/permission/${r.authorization.permission.type}/${r.authorization.permission.id}`
    },
    {
        name: "create authorization permission",
        route: r => `clients/${r.client}/authorization/permission/new/resource`
    },

    // Client scopes
    { name: "client scope list", route: () => "client-scopes" },
    { name: "create client scope", route: () => "client-scopes/new" },
    { name: "client scope", route: r => `client-scopes/${r.clientScope}/settings` },
    {
        name: "client scope mapper",
        route: r => `client-scopes/${r.clientScope}/mappers/${r.clientScopeMapper}/edit`
    },

    // Realm settings
    { name: "realm settings", route: () => "realm-settings" },
    {
        name: "key provider",
        route: r => `realm-settings/keys/providers/${r.keyProvider.id}/${r.keyProvider.providerId}/settings`
    },
    {
        name: "user profile attribute",
        route: () => "realm-settings/user-profile/attributes/email/edit-attribute"
    },
    {
        name: "create user profile attribute",
        route: () => "realm-settings/user-profile/attributes/add-attribute"
    },
    { name: "create attribute group", route: () => "realm-settings/user-profile/attributesGroup/new" },
    { name: "create client profile", route: () => "realm-settings/client-policies/profiles/add-profile" },
    {
        name: "create client policy",
        route: () => "realm-settings/client-policies/policies/add-client-policy"
    },

    // This theme's own page, rather than a vendored one.
    { name: "theme customization", route: () => "branding" },

    // Authentication
    { name: "authentication", route: () => "authentication" },
    { name: "create flow", route: () => "authentication/flows/create" },
    { name: "flow", route: r => `authentication/${r.browserFlow}/DEFAULT/builtIn` },

    // Identity providers
    { name: "identity provider list", route: () => "identity-providers" },
    { name: "create OpenID Connect provider", route: () => "identity-providers/oidc/add" },
    { name: "create SAML provider", route: () => "identity-providers/saml/add" },
    { name: "identity provider", route: () => `identity-providers/oidc/${TEST_IDENTITY_PROVIDER}/settings` },
    {
        name: "identity provider mapper",
        route: r => `identity-providers/oidc/${TEST_IDENTITY_PROVIDER}/mappers/${r.identityProviderMapper}`
    },

    // Organizations
    { name: "organization list", route: () => "organizations" },
    { name: "create organization", route: () => "organizations/new" },
    { name: "organization", route: r => `organizations/${r.organization}/settings` },

    // User federation
    { name: "user federation", route: () => "user-federation" },
    { name: "create LDAP provider", route: () => "user-federation/ldap/new" },
    { name: "create Kerberos provider", route: () => "user-federation/kerberos/new" },

    // Monitoring
    { name: "sessions", route: () => "sessions" },
    { name: "events", route: () => "events" }
];

async function lookUpRecords(): Promise<Records> {
    type Named = { id: string; name: string };
    const get = <T>(path: string) => adminApi<T>("GET", `/${realm}${path}`);
    const named = <T extends { name?: string }>(records: T[], name: string) =>
        records.find(record => record.name === name)!;

    const [[user], realmRole, [group], [client], clientScopes, [organization], flows, keys] =
        await Promise.all([
            get<{ id: string }[]>(`/users?username=${ACCOUNT_USER.username}&exact=true`),
            get<{ id: string }>("/roles/user"),
            get<Named[]>(`/groups?search=${TEST_GROUP}&exact=true`),
            get<{ id: string }[]>(`/clients?clientId=${TEST_CLIENT}`),
            get<Named[]>("/client-scopes"),
            get<Named[]>(`/organizations?search=${TEST_ORGANIZATION}&exact=true`),
            get<{ id: string; alias: string }[]>("/authentication/flows"),
            get<{ id: string; providerId: string }[]>("/components?type=org.keycloak.keys.KeyProvider")
        ]);
    const clientScope = named(clientScopes, "profile");
    const authz = `/clients/${client.id}/authz/resource-server`;
    const [subgroups, clientRoles, clientScopeMappers, mappers, resources, scopes, policies] =
        await Promise.all([
            get<Named[]>(`/groups/${group.id}/children`),
            get<Named[]>(`/clients/${client.id}/roles`),
            get<Named[]>(`/client-scopes/${clientScope.id}/protocol-mappers/models`),
            get<Named[]>(`/identity-provider/instances/${TEST_IDENTITY_PROVIDER}/mappers`),
            get<{ _id: string; name: string }[]>(`${authz}/resource`),
            get<Named[]>(`${authz}/scope`),
            // Policies and permissions share one list.
            get<(Named & { type: string })[]>(`${authz}/policy`)
        ]);
    const policy = named(policies, TEST_AUTHORIZATION_POLICY);
    const permission = named(policies, TEST_AUTHORIZATION_PERMISSION);

    return {
        user: user.id,
        realmRole: realmRole.id,
        group: group.id,
        subgroup: named(subgroups, TEST_SUBGROUP).id,
        client: client.id,
        clientRole: named(clientRoles, TEST_CLIENT_ROLE).id,
        clientScope: clientScope.id,
        clientScopeMapper: clientScopeMappers[0].id,
        identityProviderMapper: named(mappers, TEST_IDENTITY_PROVIDER_MAPPER).id,
        organization: organization.id,
        browserFlow: flows.find(flow => flow.alias === "browser")!.id,
        keyProvider: keys[0],
        authorization: {
            resource: named(resources, TEST_AUTHORIZATION_RESOURCE)._id,
            scope: named(scopes, TEST_AUTHORIZATION_SCOPE).id,
            policy: { id: policy.id, type: policy.type },
            permission: { id: permission.id, type: permission.type }
        }
    };
}

/**
 * The console renders. A crash replaces the whole console with an error page,
 * which waitForConsole catches; the error is kept at the console's root, so
 * it stays until a full page load. An unknown route renders "page not found".
 */
async function expectRendered(page: Page, where: string) {
    await waitForConsole(page, "admin", where);
    await expect(page.getByText(/page not found/i), `${where}: page not found`).toHaveCount(0);
}

/**
 * Clicks every enabled tab in the `level`th tab list of the main area, and
 * after each one, every tab of the lists nested under it.
 */
async function clickThroughTabs(page: Page, level: number, trail: string[]) {
    const tabs = page.getByRole("main").getByRole("tablist").nth(level).getByRole("tab");
    const count = await tabs.count();

    for (let index = 0; index < count; index++) {
        const tab = tabs.nth(index);

        if ((await tab.getAttribute("aria-disabled")) === "true" || (await tab.isDisabled())) {
            continue;
        }

        const name = (await tab.innerText()).trim();

        await tab.click();
        await expectRendered(page, [...trail, name].join(" > "));
        await clickThroughTabs(page, level + 1, [...trail, name]);
    }
}

test.describe(`${THEME} admin`, () => {
    test.use({ storageState: sessionFile(THEME, "admin") });

    let records: Records;

    test.beforeAll(async () => {
        records = await lookUpRecords();
    });

    for (const screen of screens) {
        test(`${screen.name}: every tab renders`, async ({ page }) => {
            await page.goto(`/admin/${realm}/console/#/${realm}/${screen.route(records)}`);
            await expectRendered(page, screen.name);
            await clickThroughTabs(page, 0, [screen.name]);
        });
    }
});
