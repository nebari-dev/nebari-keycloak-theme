import type IdentityProviderRepresentation from "@keycloak/keycloak-admin-client/lib/defs/identityProviderRepresentation";

/**
 * One provider the login page will offer.
 *
 * The label is not an identity: two providers can both be called "Corporate
 * SSO", and keying a list on the label then gives React duplicate keys and
 * unstable reconciliation. The alias is what Keycloak brokers on and is unique
 * within a realm, so it is carried alongside.
 */
export type LoginProvider = {
    id: string;
    label: string;
};

/**
 * The identity providers a realm's login page will actually offer, with the
 * label it shows for each.
 *
 * Not every stored provider becomes a button, and the difference matters to the
 * preview: showing them all puts buttons in front of an admin that real users
 * never see, and in "providers only" mode it hides the preview's password form
 * on the strength of a provider nobody can pick.
 *
 * Verified against Keycloak 26: a realm with one normal, one disabled, one
 * `hideOnLogin` and one `linkOnly` provider serves exactly the normal one in
 * `kcContext.social.providers`, which is what this reproduces.
 */
export function getLoginProviders(
    providers: IdentityProviderRepresentation[]
): LoginProvider[] {
    return providers
        .filter(
            provider =>
                provider.enabled !== false &&
                /* Hidden from the login form, but still usable through a direct
                   broker link. */
                provider.hideOnLogin !== true &&
                /* Attachable to an existing account only; never an entry point. */
                provider.linkOnly !== true &&
                /* Scoped to an organization's own members rather than the
                   general login form. */
                provider.organizationId === undefined &&
                /* Keycloak before `hideOnLogin` was promoted to the
                   representation kept the same switch in `config`, where it is
                   a string. Realms upgraded from those versions still carry it. */
                provider.config?.hideOnLoginPage !== "true"
        )
        .map((provider, index) => ({
            /* `alias` is optional on the representation but is the realm-unique
               key in practice; `internalId` and then the position are fallbacks
               so a malformed record still gets a stable key rather than
               colliding with another one. */
            id: provider.alias || provider.internalId || `provider-${index}`,
            label: provider.displayName || provider.alias || "Provider"
        }));
}
