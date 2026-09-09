import { expect, test } from "@playwright/test";
import { getLoginProviders } from "../src/branding/loginProviders";

/**
 * Recorded from Keycloak 26 after creating four OIDC providers on a realm — one
 * normal, one disabled, one `hideOnLogin`, one `linkOnly`. That realm's login
 * page served exactly one entry in `kcContext.social.providers`, "Normal IdP",
 * so that is what this must reproduce.
 */
const RECORDED = [
    {
        "alias": "idp-disabled",
        "displayName": "Disabled IdP",
        "enabled": false,
        "hideOnLogin": false,
        "linkOnly": false
    },
    {
        "alias": "idp-hidden",
        "displayName": "Hidden IdP",
        "enabled": true,
        "hideOnLogin": true,
        "linkOnly": false
    },
    {
        "alias": "idp-linkonly",
        "displayName": "Link Only IdP",
        "enabled": true,
        "hideOnLogin": false,
        "linkOnly": true
    },
    {
        "alias": "idp-normal",
        "displayName": "Normal IdP",
        "enabled": true,
        "hideOnLogin": false,
        "linkOnly": false
    }
];

test("keeps only the providers the login page actually offers", () => {
    expect(getLoginProviders(RECORDED)).toEqual([
        { id: "idp-normal", label: "Normal IdP" }
    ]);
});

test("excludes organization-scoped and legacy-hidden providers", () => {
    expect(
        getLoginProviders([
            { alias: "org", displayName: "Org IdP", enabled: true, organizationId: "abc" },
            {
                alias: "legacy",
                displayName: "Legacy Hidden",
                enabled: true,
                config: { hideOnLoginPage: "true" }
            },
            { alias: "keep", displayName: "Keep Me", enabled: true }
        ])
    ).toEqual([{ id: "keep", label: "Keep Me" }]);
});

test("falls back to the alias when a provider has no display name", () => {
    expect(getLoginProviders([{ alias: "github", enabled: true }])).toEqual([
        { id: "github", label: "github" }
    ]);
});

test("a provider with no flags set at all is treated as offered", () => {
    expect(getLoginProviders([{ alias: "bare" }])).toEqual([
        { id: "bare", label: "bare" }
    ]);
});

/**
 * The label is not an identity. Two providers sharing a display name used to
 * produce duplicate React keys in the preview; the alias keeps them distinct.
 */
test("gives providers sharing a display name distinct ids", () => {
    const providers = getLoginProviders([
        { alias: "sso-eu", displayName: "Corporate SSO", enabled: true },
        { alias: "sso-us", displayName: "Corporate SSO", enabled: true }
    ]);

    expect(providers.map(provider => provider.label)).toEqual([
        "Corporate SSO",
        "Corporate SSO"
    ]);
    expect(new Set(providers.map(provider => provider.id)).size).toBe(2);
});

test("falls back past a missing alias to something still unique", () => {
    const providers = getLoginProviders([
        { internalId: "abc", enabled: true },
        { enabled: true },
        { enabled: true }
    ]);

    expect(providers.map(provider => provider.id)).toEqual([
        "abc",
        "provider-1",
        "provider-2"
    ]);
    expect(new Set(providers.map(provider => provider.id)).size).toBe(3);
});
