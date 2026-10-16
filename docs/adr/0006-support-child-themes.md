# 0006 — Support Keycloak child themes as the extension path beyond runtime branding

- **Status:** ACCEPTED
- **Date:** 2026-10-16

## Context

Theme customization covers a fixed set of settings a realm admin can change at runtime. Some brands need more:
their own CSS, logo files and login wording. The OpenTeams Collab brand was built into this repository for that
reason, which put a client's branding into a Nebari repository and gave every further brand the same choice:
add it here, or fork.

Keycloak already has a mechanism for this. A theme can declare `parent=<theme>` and is resolved child first,
falling back to the parent for every template, resource and message it does not provide. Measured against this
theme on Keycloak 26.8, a child (`examples/child-theme/acme`) ran the parent unchanged, and its
`theme.properties` reached all three applications. Four gaps kept it from changing anything:

- The theme name compiled into each JAR is the parent's, so `data-brand` never named the child and its CSS had
  nothing to scope to.
- The login pages and the Account Console ignored the child's `styles`. Keycloakify's Admin Console loader
  already loaded them.
- The Nebari login pages use literal colours fixed to the Nebari design, so token overrides did not reach them.
- The login pages bundle their text, so neither a child's `messages_*.properties` nor a realm's localization
  overrides changed it.

The alternatives considered were publishing this theme as a Keycloakify extension package (undocumented in
Keycloakify 11, collides with the console extensions this theme already consumes, and makes every downstream
file an owned copy) and publishing the source as a library to wrap (a JavaScript build per brand, and deep
components only replaceable through hooks this theme would have to add anyway).

## Decision

Support Keycloak child themes, through four `theme.properties` keys read by this theme:

- `brand`: stamped on `<html>` as `data-brand`, validated as a short lowercase identifier.
- `styles`: loaded from the child's resources on the login pages and in the Account Console, after this theme's
  CSS and kept last. Validated as relative `.css` paths.
- a child `brand` on the Nebari login pages switches on the token-driven `[data-branded]` rules.
- `messageOverrides`: login message keys the template embeds from Keycloak's own message resolution.

## Because

- No downstream file is a copy of a file here, so an upgrade is a base-image bump with nothing to merge.
- Keycloak's own resolution order applies throughout: a realm's localization override still beats the child's
  messages, and a published Theme customization config still applies on top of the child's styles.
- The child needs no JavaScript build.

## Consequences

- `data-brand`, `data-kc-theme-type`, `data-theme`, the custom properties on `:root` in `src/theme.css`, and the
  logo paths under `dist/logo/` are now a contract with downstream themes. Renaming or removing one is a breaking
  change. Class names inside the pages are not part of it.
- A child cannot change markup or add pages.
- The Account console's literal colours limit how far a token override reaches there until that stylesheet is
  converted to tokens.
- The Collab theme can move to its own repository as a child of `nebari`, which is what removing it from this
  repository relies on.
