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
| `npm run docs:console-images` | Recaptures the Admin Console images in [Theme customization](theme-customization.md) from the compose loop |
| `npm run lint` | Biome lint and format check, failing on warnings |
| `npm run format` | Biome formatter, writing changes in place |

CI runs the same check as `biome ci --error-on-warnings .`. See [Lint and format](#lint-and-format).

## Lint and format

[Biome](https://biomejs.dev/) lints and formats the tracked JavaScript and TypeScript, configured in
[`biome.json`](../biome.json). It skips gitignored files, so the vendored console sources are never checked, and
it skips the generated `src/kc.gen.tsx`.

The rules are listed one by one in `biome.json` rather than taken from Biome's `recommended` preset. They cover
general correctness, TypeScript, the rules of hooks (`useHookAtTopLevel`, `useExhaustiveDependencies`) and
Fast Refresh boundaries (`useComponentExportOnlyModules`). `noExplicitAny`, `useExhaustiveDependencies` and
`useComponentExportOnlyModules` are warnings, and `npm run lint` fails on warnings too.

The formatter writes 4-space indents, double quotes, no trailing commas and 110-column lines. It leaves some files
in their own style:

| Files | Formatter | Linter | Why |
| --- | --- | --- | --- |
| `src/components/ui/`, `src/components/shadcn/`, `src/lib/utils.ts`, `src/hooks/theme-provider.tsx`, `src/hooks/use-theme-preference.ts` | Off | Off | Registry files. `shadcn add` overwrites them |
| `src/account/`, `src/admin/` (except `src/admin/branding/`), `src/shared/`, `public/keycloak-theme/` | Off | On | Owned files keep upstream's formatting so they still diff cleanly against the originals |
| `scripts/check-*.mjs` | 2-space, trailing commas | On | Formatted in the style they were written in |

The Theme customization editor in `src/admin/branding/` is written in this repo rather than vendored, so it is
formatted like the rest of `src/`.

A `// biome-ignore <rule>: <reason>` comment suppresses one diagnostic. Biome reports a suppression that no longer
matches anything.

`@biomejs/biome` is pinned exactly, because a Biome release can change formatter output. Dependabot proposes it in
its own pull request, apart from the other minor and patch updates; run `npm run format` on that branch.

## What CI checks

Every pull request runs [`playwright.yml`](../.github/workflows/playwright.yml):

1. **Theme guards** &mdash; `npm run check`
2. **Type check** &mdash; `npm run typecheck`
3. **Lint and format check** &mdash; `biome ci --error-on-warnings .`, the CI form of `npm run lint`
4. **Screenshot comparison** &mdash; `npm run test:screenshots` against `tests/screenshots/linux/<brand>/`

Pull requests and pushes to `main` also run the publisher. On a pull request it builds the JARs and the image
for both architectures without pushing, so a packaging failure shows up before merge. See
[Releasing](releasing.md).

**What CI does not cover:** the Admin and Account consoles have no automated visual or behavioural test. The
screenshots are login pages only, because the consoles need a live Keycloak session to render. The upgrade
guards below exist partly to narrow that gap. For console changes, check them by hand in the
[compose loop](quick-start.md#the-compose-loop-consoles).

## Screenshot tests

Each theme in [`tests/visual.spec.ts`](../tests/visual.spec.ts) runs the ten login previews and a full-page
capture in light and dark mode; dark baselines carry a `-dark` suffix. They are compared against baselines on every
pull request. Preview a theme in the dev server with `?theme=template`.

```bash
npx playwright install chromium   # once, and again after a Playwright upgrade
npm run test:screenshots          # compare
npm run test:screenshots:update   # accept the current rendering
```

[`docs/screenshots.md`](screenshots.md) shows every baseline. It links the baseline files rather than copying
them, so it always shows what `main` renders. [`tests/screenshot-gallery.spec.ts`](../tests/screenshot-gallery.spec.ts)
fails when the page's list of screenshots no longer matches the baselines, and `test:screenshots:update` rewrites
the page along with them.

[Theme customization](theme-customization.md) shows two kinds of image:

- **What a setting does to the login page.** [`tests/theme-customization-gallery.spec.ts`](../tests/theme-customization-gallery.spec.ts)
  renders an example brand, kept in [`tests/fixtures/branding/`](../tests/fixtures/branding/), and stores the
  results as ordinary baselines under `tests/screenshots/linux/theme-customization/`. The doc links them, so CI
  keeps them current like the rest.
- **The editor itself.** It is part of the Admin Console, which the dev server can't render, so
  [`tests/console/theme-customization.capture.ts`](../tests/console/theme-customization.capture.ts) captures it from
  the compose loop into `docs/images/theme-customization/`. It seeds the example brand into the `nebari` realm
  through the Admin API, captures, and removes it again. CI doesn't run it: after changing the editor, run
  `docker compose up -d --build keycloak`, then `npm run docs:console-images`, and commit the images.

### Regenerate baselines on Linux

Baselines are stored per platform and brand in `tests/screenshots/<platform>/<brand>/`, because each OS
rasterises fonts slightly differently. CI runs on Linux, so **only the `linux/` baselines count**. Updating on macOS or Windows writes to
a different directory and won't satisfy the check.

If you aren't on Linux, run the update inside the Playwright container. Its tag must match the installed
`@playwright/test` version (`npx playwright --version`), or the browser build won't match the one CI uses:

```bash
docker run --rm -v "$PWD":/work -v /work/node_modules -w /work --ipc=host \
  mcr.microsoft.com/playwright:v1.63.0-noble \
  sh -c "npm ci && npm run test:screenshots:update"
```

The second `-v` gives the container its own `node_modules`, so it installs Linux binaries without touching
yours.

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

## What the type check covers

`npm run typecheck` checks everything under `src/`, including the owned console files such as `PageNav.tsx` and
`KeycloakDataTable.tsx`. The only file that opts out with `// @ts-nocheck` is the generated `src/kc.gen.tsx`.
Nothing under `tests/` is type-checked: Playwright transpiles the specs without checking them.
[Ownership](ownership.md) covers the owned files.

## Next

- [Architecture](architecture.md) &mdash; what the shim, the adapters and the cascade layers are doing
- [Ownership](ownership.md) &mdash; before claiming or changing an owned file
