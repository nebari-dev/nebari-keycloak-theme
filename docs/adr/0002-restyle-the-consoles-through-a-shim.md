# 0002 — Restyle the consoles through a PatternFly shim, not by forking views

- **Status:** ACCEPTED
- **Date:** 2026-08-31 (recorded afterwards, in September 2026)
- **Implemented in:** #15

## Context

After [ADR 0001](0001-adopt-the-nebari-design-registry.md), a user signing in moved from a Nebari login page into
a stock Keycloak Admin or Account console. Those consoles are complete React applications, roughly 520 views,
vendored from Keycloakify's packages and re-synced on every install.

Keycloakify's answer to changing a vendored view is to *own* it: take it out of the sync and edit it. Owning
views one by one would mean maintaining hundreds of forks, each of which stops receiving upstream fixes and has
to be merged by hand on every Keycloak upgrade.

## Decision

Own one file instead: `src/shared/@patternfly/react-core/index.tsx`, the module every console view imports
PatternFly through. Keycloakify generates it as `export * from "@patternfly/react-core"`. This theme keeps the
wildcard and adds explicit exports after it; in ES modules an explicit export wins, so those names resolve to
Nebari components in every view without editing any view.

The shadowed components are `Button`, `TextInput`, `TextArea`, `Switch`, `Checkbox` and `Label`. Each is an
adapter in `src/components/patternfly/` that presents **PatternFly's public API exactly** and renders a Nebari
component. Everything not shadowed stays PatternFly and is restyled to the same tokens by `src/admin/index.css`.

Some components stay on PatternFly deliberately. The reasons, one per component, are in
`src/components/patternfly/README.md`.

## Because

- One owned file restyles every call site at once, and the views themselves keep flowing in from upstream.
- The PatternFly API is the contract the views were written against, so preserving it is what makes the swap
  invisible to them.

## Consequences

- **The adapters have to match PatternFly exactly, and any difference breaks every view that depends on it.**
  Three have bitten already: refs from react-hook-form's `register()` had to be forwarded by hand under React 18,
  or fields rendered and saved blank; Base UI passes an `eventDetails` wrapper where PatternFly passes an event,
  which made react-hook-form store the wrapper as a checkbox's value; and `readOnlyVariant` has to take precedence
  over `readOnly`, as it does in PatternFly.
- **The seam is only as good as its coverage.** It works because no view imports `@patternfly/react-core`
  directly. Nothing currently enforces that; it holds by convention.
- **The consoles have no automated test.** They need a live Keycloak session, which the screenshot suite doesn't
  have, so adapter changes are checked by hand.
- Some screens still needed owned files &mdash; the sidebar, the data table, the headers. Keeping that set small
  is [ADR 0004](0004-keep-owned-files-few-and-guarded.md).
