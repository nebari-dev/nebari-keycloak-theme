# 0001 — Build the login pages on the `@nebari` design-system registry

- **Status:** ACCEPTED
- **Date:** 2026-08-28 (recorded afterwards, in September 2026)
- **Implemented in:** #13

## Context

The login page is the first Nebari screen any user sees, and it looked nothing like the rest of the platform
(issue #2). The theme at the time styled its pages with hand-written `.nebari-*` classes over a separate token
set, so every visual change was a one-off and drifted from the product it was meant to match.

Nebari already has a design system, [nebari-design](https://nebari-dev.github.io/nebari-design/), published as
a shadcn registry. The landing page and other Nebari UIs consume it.

## Decision

Build the login pages from the registry's components, installed with `npx shadcn add @nebari/<name>` and
registered as `@nebari` in `components.json`. That brings in Tailwind v4 and Base UI.

The installed files under `src/components/ui/` and the registry hooks under `src/hooks/` are **upstream-managed
and never edited**. Customisation happens at the call site &mdash; `className`, Base UI's `render` prop, or a
wrapper in `src/components/nebari/`. An `@/ui/*` path alias exists only so registry files, which import each other
that way, install without local edits.

## Because

- The login pages then share one visual language with the rest of Nebari, instead of imitating it.
- Design fixes arrive by reinstalling a component rather than by rediscovering them here.
- Treating the files as read-only is what makes reinstalling safe. A local edit to a registry file is silently
  overwritten by the next `shadcn add` &mdash; that happened once in this repo before the rule was written down.

## Consequences

- **Two ways to style a login field.** Keycloakify's `UserProfileFormFields`, used by update-profile and by
  registration when User Profile is on, takes CSS class names rather than components. The `.nebari-*` field
  classes therefore survive and have to be kept visually in step with the components by hand.
- **React 18 versus React 19 conventions.** Registry components take `ref` as a plain prop, the React 19 way.
  This app is held at React 18 by the Keycloakify console packages, so anywhere a real DOM node is needed the
  theme renders one through `render`.
- It set the direction the consoles later followed, in [ADR 0002](0002-restyle-the-consoles-through-a-shim.md).
