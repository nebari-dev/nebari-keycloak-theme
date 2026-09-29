# 0004 — Keep owned files few, and guard the ones that stay owned

- **Status:** ACCEPTED
- **Date:** 2026-09-23 (recorded afterwards, in September 2026)
- **Implemented in:** #38, #39

## Context

[ADR 0002](0002-restyle-the-consoles-through-a-shim.md) avoided forking views wholesale, but the first Admin
theme still took the owned set from 6 files to 15. Each owned file costs a manual merge on every Keycloak upgrade.

Worse, owned files fail **silently**. When Keycloak adds a console section upstream, an owned `PageNav.tsx` just
doesn't render it. When Keycloak moves to PatternFly 6, over 600 `pf-v5-*` references in this theme stop matching
and the consoles drift back towards stock. Neither is a type error; the build, the type check and the login
screenshots all stay green.

## Decision

**Own a file only when a seam can't do the job,** and hand back forks that don't clear that bar. Four were handed
back: three owned to give two of 48 list screens a server-side page count, and a masthead owned for a single
caller that was already owned.

**Guard owned files whose drift would be silent,** with scripts that run in every build and in CI:

- `check-page-nav-sync` compares the owned navigation against the upstream original &mdash; both the static
  destinations and the number of render sites
- `check-patternfly-version` fails when the installed PatternFly major no longer matches the references in tracked
  files

**Handing a file back takes two steps:** `keycloakify own --revert`, then `git rm --cached`. `.gitignore` doesn't
untrack a file, so skipping the second leaves the fork in git, where it shows up as modified the first time
`sync-extensions` pulls an upstream change.

## Because

The cost of an owned file is paid later, by whoever does the next Keycloak upgrade, often under time pressure for a
security release. Keeping the set small reduces that cost, and the guards turn the worst failures from something
noticed by eye into a build error.

## Consequences

- **A guard that can't fail is worse than none.** It creates confidence it hasn't earned. The navigation guard
  originally matched raw source, so commenting an entry out satisfied it; it now strips comments first. The
  PatternFly guard originally read the version from `@patternfly/react-core` rather than `@patternfly/patternfly`,
  which ships the classes. Both were found by constructing the failure case rather than by reading the script.
- **A passing PatternFly guard isn't a finished port.** PatternFly 6 removed the `--pf-v5-global--*` tokens rather
  than renaming them, so a mechanical rename passes the guard and is still wrong.
- **The guards don't cover the consoles visually.** That gap remains; see
  [Development](../development.md#what-ci-checks).
- All four handed-back files were left tracked by #38 and untracked in #39, which is where the two-step rule
  above comes from.
