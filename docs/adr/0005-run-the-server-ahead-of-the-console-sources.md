# 0005 — Run the Keycloak server ahead of the vendored console sources

- **Status:** ACCEPTED
- **Date:** 2026-10-07

## Context

The published images were based on Keycloak 26.0, while the vendored Admin and Account consoles come from
Keycloak 26.5.2 (`@keycloakify/keycloak-*-ui` `260502`). Every 26.x release up to 26.7.1 carries
[CVE-2026-18963](https://access.redhat.com/security/cve/CVE-2026-18963), an unauthenticated account takeover
through the reset-credentials flow (CVSS 9.1).

The fixed Red Hat builds, 26.4.15 and 26.6.6, are only on Red Hat's subscription registry. On
`quay.io/keycloak/keycloak` the first fixed release is 26.7.2. The 26.5 line ended at 26.5.7 without the fix.

The alternatives were:

- **Match the server to the consoles at 26.5.x.** Leaves CVE-2026-18963 and, on 26.5.0, 14 other high-severity
  Keycloak findings unfixed.
- **Re-sync the consoles to `260700`.** Re-merges every owned file against new upstream originals. Not needed to
  ship the fix.
- **Base the image on the Red Hat build.** Every consumer of the image would need Red Hat registry credentials.

## Decision

**Base the images on Keycloak 26.8.0 and keep the console sources at `260502`.** The Keycloak version is set in the
`Dockerfile` and in both build steps of `publish-keycloak-image.yml`.

## Because

Same theme JARs, compared on 26.5.0, 26.7.5 and 26.8.0, 64 screens across both brands and both color schemes:

- The login pages are pixel-identical
- No console request fails, and console errors are the same on all three
- The other screens differ only in content the server sends, such as new identity-provider types and session data

## Consequences

- **The Admin console shows a Workflows section.** The server enables the feature and the owned `PageNav.tsx`
  already renders it. It is styled like the other sections and its page loads.
- **Console features added upstream after 26.5.2 don't appear** until the console sources are re-synced.
- **Saving was not tested.** The comparison opened pages but saved nothing. Check create and edit flows in the
  compose loop after each server bump.
- **`@keycloak/keycloak-admin-client` stays at 26.5.2.** The console packages pin it exactly. Its audit advisory,
  GHSA-r8jr-wg88-fq5c, is a server flaw that 26.8.0 doesn't have.
