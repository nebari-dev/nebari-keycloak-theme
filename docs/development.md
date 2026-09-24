# Development

Setting up is covered in [Quick start](quick-start.md). This page is the reference for everything after that.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server for the login pages, with `?preview=` mocks |
| `npm run build-keycloak-theme` | Runs `build`, then packages the Keycloak JARs into `dist_keycloak/` |
| `npm run build` | Upgrade guards, then `tsc`, then `vite build` |
| `npm run check` | Both [upgrade guards](#upgrade-guards) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:screenshots` | Compares the login pages against the committed baselines |
| `npm run test:screenshots:update` | Accepts the current rendering as the new baselines |
| `npm run lint` | ESLint with `--max-warnings 0` |

`npm run lint` is not part of CI and currently reports problems in generated, gitignored console files that
this repo doesn't author. Run it on the files you touched rather than treating the whole-repo result as a gate.

## What CI checks

Every pull request runs [`playwright.yml`](../.github/workflows/playwright.yml):

1. **Theme guards** &mdash; `npm run check`
2. **Type check** &mdash; `npm run typecheck`
3. **Screenshot comparison** &mdash; `npm run test:screenshots` against `tests/screenshots/linux/`

Pushes to `main` also run the publisher, which builds through `npm run build` and so runs the guards again.
See [Releasing](releasing.md).

**What CI does not cover:** the Admin and Account consoles have no automated visual or behavioural test. The
screenshots are login pages only, because the consoles need a live Keycloak session to render. The upgrade
guards below exist partly to narrow that gap. For console changes, check them by hand in the
[compose loop](quick-start.md#the-compose-loop-consoles).

## Screenshot tests

The ten login previews, a dark-mode sign-in and two full-page captures are compared against baselines on every
pull request.

```bash
npm run test:screenshots          # compare
npm run test:screenshots:update   # accept the current rendering
```

### Regenerate baselines on Linux

Baselines are stored per platform in `tests/screenshots/<platform>/`, because each OS rasterises fonts slightly
differently. CI runs on Linux, so **only the `linux/` baselines count**. Updating on macOS or Windows writes to
a different directory and won't satisfy the check.

If you aren't on Linux, run the update inside the Playwright container that matches the pinned version:

```bash
docker run --rm -v "$PWD":/work -w /work --ipc=host \
  mcr.microsoft.com/playwright:v1.62.1-noble \
  npm run test:screenshots:update
```

### Rebaselining is a review decision, not a formality

A baseline records what the branch renders, not what was intended. When you rebaseline, you are telling CI
that the new rendering is correct &mdash; so look at the diff before committing it. This has already let a
regression through once: a CSS change in the consoles turned the social sign-in buttons purple, the baseline
was regenerated in the same commit, and CI went green on it.

Each CI run uploads two artifacts to help with that: `playwright-report` (the diff when a comparison fails) and
`theme-screenshots` (what the branch actually rendered, whether or not it matched).

## Upgrade guards

`npm run check` runs two scripts that catch breakage `tsc` cannot see. Both fail the build; neither is a type
error, which is why CI runs them as their own step.

### `check:page-nav-sync`

[`src/admin/PageNav.tsx`](../src/admin/PageNav.tsx) is owned &mdash; forked from Keycloak so it can host
Nebari's sidebar and, later, a Software Packs entry. `keycloakify sync-extensions` never refreshes an owned file,
so when Keycloak adds a console section upstream, it would simply never appear here.

The guard compares the owned file against the upstream original in `node_modules` on two counts: the set of
static `<LeftNav path="...">` destinations, and the total number of `<LeftNav>` render sites. The second count
catches a section added with a computed path, which the first can't see. Comments are stripped before matching,
so commenting an entry out doesn't satisfy it.

To add a destination on purpose, list it in `NEBARI_ONLY` in
[`scripts/check-page-nav-sync.mjs`](../scripts/check-page-nav-sync.mjs).

### `check:patternfly-version`

More than 600 references in this theme name PatternFly's classes and tokens by major version &mdash;
`.pf-v5-c-table`, `--pf-v5-global--primary-color--100`. When Keycloak moves to PatternFly 6 those all become
`pf-v6-*`, and every selector silently matches nothing. The build, the type check and the screenshots would all
still pass; the consoles would just drift back towards stock.

The guard reads the installed `@patternfly/patternfly` major and fails if any tracked file references a
different one. **Treat a failure as a port, not a version bump** &mdash; PatternFly 6 removed the
`--pf-v5-global--*` token family outright rather than renaming it, so a mechanical find-and-replace will pass
the guard and still be wrong.

## Owned files and `@ts-nocheck`

Most owned files keep the `/* eslint-disable */` and `// @ts-nocheck` they were vendored with, so the type check
skips them. For a file that has been substantially rewritten &mdash; `PageNav.tsx`, `KeycloakDataTable.tsx`
&mdash; that means your changes aren't type-checked either. Test those changes in the compose loop.
[Ownership](ownership.md) covers the rest.

## Next

- [Architecture](architecture.md) &mdash; what the shim, the adapters and the cascade layers are doing
- [Ownership](ownership.md) &mdash; before claiming or changing an owned file
