# Development

Setting up is covered in [Quick start](quick-start.md). This page is the reference for everything after that.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server for the login pages, with `?preview=` mocks |
| `npm run build-keycloak-theme` | Runs `build`, then packages the Keycloak JARs into `dist_keycloak/` |
| `npm run build` | Upgrade guards, then `tsc`, then `vite build` |
| `npm run check` | Both [upgrade guards](#upgrade-guards) |
| `npm run typecheck` | `tsc --noEmit` on `src/`, then on `tests/` and the Playwright configs (`tsconfig.tests.json`) |
| `npm run test:screenshots` | Runs every dev-server spec except accessibility: screenshot baselines, branding, child themes |
| `npm run test:screenshots:update` | Accepts the current rendering as the new baselines |
| `npm run test:a11y` | [Accessibility tests](#accessibility-tests) for the login pages, against the dev server |
| `npm run test:a11y:consoles` | Accessibility tests for the Admin and Account consoles, against the compose loop |
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

Every pull request runs [`playwright.yml`](../.github/workflows/playwright.yml), in two jobs:

- **`screenshots`**, against the dev server:
  1. **Theme guards** &mdash; `npm run check`
  2. **Type check** &mdash; `npm run typecheck`
  3. **Lint and format check** &mdash; `biome ci --error-on-warnings .`, the CI form of `npm run lint`
  4. **Screenshot comparison** &mdash; `npm run test:screenshots` against `tests/screenshots/linux/<theme>/`
  5. **Login-page accessibility** &mdash; `npm run test:a11y`, including the tests of the checks themselves
- **`consoles`**, against a real Keycloak: builds the theme JARs, starts the compose loop, and runs
  `npm run test:a11y:consoles`. On failure it prints the Keycloak log, and it uploads the report as
  `playwright-report-consoles`.

Pull requests and pushes to `main` also run the publisher. On a pull request it builds the JARs and the image
for both architectures without pushing, so a packaging failure shows up before merge. See
[Releasing](releasing.md).

**What CI does not cover:** the consoles have accessibility tests but no visual or behavioural ones. The
screenshots are login pages only, and nothing checks that a console screen *works*, only that it is
accessible. The upgrade guards below exist partly to narrow that gap. For console changes, still check them by
hand in the [compose loop](quick-start.md#the-compose-loop-consoles).

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
  through the Admin API, captures, and removes it again. It is the `docs-images` project of
  [`playwright.consoles.config.ts`](../playwright.consoles.config.ts), which CI doesn't run: after changing the
  editor, run `docker compose up -d --build keycloak`, then `npm run docs:console-images`, and commit the images.

## Accessibility tests

[`tests/a11y/`](../tests/a11y/) checks the login pages and the Admin and Account consoles in every theme in
[`themes.json`](../themes.json). The checks know nothing about any one theme, so a new theme is covered as soon
as it is listed. The target is WCAG 2.2 AA, which includes every 2.1 A and AA criterion.

| Check | What it catches | Where |
| --- | --- | --- |
| axe scan | Colour contrast, names and labels, ARIA, landmarks, target size &mdash; every axe rule tagged WCAG A/AA | Every page, light and dark |
| axe best practices | Positive `tabindex`, one main landmark, one `h1` | Login pages only: their markup is ours, the consoles' is vendored |
| Keyboard reach | A visible control Tab never reaches (2.1.1) | Every page |
| Focus indicator | A stop whose focused look doesn't differ from its unfocused one, pseudo-elements and `:focus-within` wrappers included (2.4.7) | Every page |
| No trap | Shift+Tab not retracing the Tab order (2.1.2) | Every page |
| Errors | An invalid field whose message isn't referenced by `aria-describedby` or `aria-errormessage` (1.3.1, 3.3.1) | Login |
| Submit | Enter not submitting a filled-in form | Login |
| Reflow | Horizontal scrolling at 320px (1.4.10) | Login |
| Motion | Animation still running under `prefers-reduced-motion` (2.3.3) | Login |
| Dialogs | A dialog that doesn't take focus, lets Tab out, ignores Escape or loses its trigger's focus (2.4.3) | Admin |
| Menus | A menu that won't open, navigate or close from the keyboard, or misreports `aria-expanded` (4.1.2) | Admin |

A control out of the Tab order passes only when something focusable stands in for it: a table row that opens
its link on Enter, a combobox input for its toggle button, or a composite widget's roving focus. One that
enables or disables itself as focus moves, like PatternFly's tab-scroll buttons, isn't counted as skipped.
The keyboard checks run once per theme; the colour scheme changes neither the Tab order nor whether focus
changes how an element looks.

```bash
npm run test:a11y                              # login pages; starts the dev server itself
docker compose up -d --build keycloak          # the consoles need a real Keycloak
npm run test:a11y:consoles                     # Admin and Account; KEYCLOAK_URL overrides http://localhost:8080
```

The login suite is the `a11y-login` project of [`playwright.config.ts`](../playwright.config.ts), beside the
project that runs every other spec. The console suites are projects of
[`playwright.consoles.config.ts`](../playwright.consoles.config.ts), so a plain `npx playwright test` never needs
Keycloak. Their setup project creates a realm per theme, `a11y-<theme>`, cloned from `realm-export.json` through
the admin REST API as the master `admin`, and never touches the `nebari` realm. It adds what an empty realm
hides &mdash; an identity provider so the Account Console lists Linked accounts, a group, and the right to view
it &mdash; then signs in once per console. The Admin screens are the ones used most: users, roles, groups,
clients, client scopes, realm settings, Theme customization, authentication, identity providers, user
federation, sessions and events.

### Reading a failure

- **axe** failures print one line per element: the rule, its selector, and for contrast the two colours and
  the ratio. Open the page in the dev server (`?preview=<page>&theme=<theme>`) or the console, and find the
  element in devtools.
- **Keyboard** failures name the controls by role and accessible name: `controls that Tab never reaches`,
  `focus stops without a visible focus indicator`, or a diff between the Tab and Shift+Tab orders.
- `npx playwright test --ui`, or `npx playwright test -c playwright.consoles.config.ts --ui` for the consoles,
  opens Playwright's UI mode, which shows each step with a DOM snapshot. In the consoles window, run the
  `consoles-setup` tests first if the saved sign-ins are older than Keycloak's 30-minute idle timeout.

### Known violations

Problems that exist today are listed in [`tests/a11y/known-violations.ts`](../tests/a11y/known-violations.ts),
so the suite stays green and still fails on anything new. Each entry is one rule, scoped to its surfaces and
themes, matched by a selector or an exact colour pair, with the reason and the issue that will fix it. Don't add
an entry to make a test pass: fix the problem, or file the issue first. When the issue is fixed, delete the
entry so the check guards the fix.

### The checks are tested too

[`tests/a11y/helpers.spec.ts`](../tests/a11y/helpers.spec.ts) builds small pages that break each rule and
proves the checks fail on them, and pages using each legitimate pattern and proves they pass. It runs with the
login suite. A check that stops failing looks exactly like a page that passes &mdash; a bad element key once
made every keyboard walk stop after its first stop, and only this caught it.

### Why axe is loaded early in the consoles

The consoles freeze built-in prototypes through oidc-spa's `browserRuntimeFreeze`, and `@axe-core/playwright`
injects axe after load, which that freeze rejects. For the consoles, [`tests/a11y/axe.ts`](../tests/a11y/axe.ts)
loads axe before the page's scripts and patches one assignment in it; it throws if an axe upgrade removes that
assignment, rather than silently scanning nothing. The login pages use `@axe-core/playwright` directly.

`axe-core` and `@axe-core/playwright` are pinned exactly, because a new axe release adds rules that can fail the
suites without a code change. Dependabot proposes them in their own pull request, so what the new rules find is
reviewed on its own.

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
It then checks `tests/` and both Playwright configs through [`tsconfig.tests.json`](../tsconfig.tests.json), which
adds Node's types: Playwright transpiles the specs without checking them, so this is the only check they get.
[Ownership](ownership.md) covers the owned files.

## Next

- [Architecture](architecture.md) &mdash; what the shim, the adapters and the cascade layers are doing
- [Ownership](ownership.md) &mdash; before claiming or changing an owned file
