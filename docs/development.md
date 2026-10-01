# Development

Setting up is covered in [Quick start](quick-start.md). This page is the reference for everything after that.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server for the login pages, with `?pageId=` and `?preview=` mocks |
| `npm run build-keycloak-theme` | Runs `build`, then packages the Keycloak JARs into `dist_keycloak/` |
| `npm run build` | Upgrade guards, then `tsc`, then `vite build` |
| `npm run check` | Both [upgrade guards](#upgrade-guards) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:screenshots` | Compares the login pages against the committed baselines |
| `npm run test:screenshots:update` | Accepts the current rendering as the new baselines |
| `npm run test:a11y` | [Accessibility tests](#accessibility-tests) for the login pages, against the dev server |
| `npm run test:a11y:consoles` | Accessibility tests for the Admin and Account consoles, against the compose Keycloak |
| `npm run test:a11y:admin` / `test:a11y:account` | One console's accessibility tests |
| `npm run lint` | ESLint with `--max-warnings 0` |

`npm run lint` is not part of CI and currently reports problems in generated, gitignored console files that
this repo doesn't author. Run it on the files you touched rather than treating the whole-repo result as a gate.

## What CI checks

Every pull request runs [`playwright.yml`](../.github/workflows/playwright.yml), which runs every Playwright
test in two jobs:

- **`screenshots`**, against the dev server:
  1. **Theme guards** &mdash; `npm run check`
  2. **Type check** &mdash; `npm run typecheck`
  3. **Screenshot comparison** &mdash; `npm run test:screenshots` against `tests/screenshots/linux/<brand>/`
  4. **Login-page accessibility** &mdash; `npm run test:a11y`, including the tests of the checks themselves
- **`consoles`**, against a real Keycloak: builds the theme JARs (`npm run build-keycloak-theme`), starts the
  compose stack, and runs `npm run test:a11y:consoles`. On failure it prints the Keycloak log, and it uploads
  the report as `playwright-report-consoles`.

Pushes to `main` also run the publisher, which builds through `npm run build` and so runs the guards again.
See [Releasing](releasing.md).

**What CI does not cover:** the consoles have accessibility tests but no visual or behavioural ones. The
screenshots are login pages only, and nothing checks that a console screen *works*, only that it is
accessible. The upgrade guards below exist partly to narrow that gap. For console changes, still check them by
hand in the [compose loop](quick-start.md#the-compose-loop-consoles).

## Screenshot tests

Each brand in [`tests/visual.spec.ts`](../tests/visual.spec.ts) runs the ten login previews and a full-page
capture, and Nebari adds a dark-mode sign-in and a dark full-page capture. Collab has one dark palette in both
modes, so a dark capture of it would only repeat the light one. They are compared against baselines on every
pull request. Preview a brand in the dev server with `?theme=collab`.

```bash
npm run test:screenshots          # compare
npm run test:screenshots:update   # accept the current rendering
```

### Regenerate baselines on Linux

Baselines are stored per platform and brand in `tests/screenshots/<platform>/<brand>/`, because each OS
rasterises fonts slightly differently. CI runs on Linux, so **only the `linux/` baselines count**. Updating on macOS or Windows writes to
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

## Accessibility tests

[`tests/a11y/`](../tests/a11y/) checks the login pages and the Admin and Account consoles in every theme in
[`themes.json`](../themes.json). The checks know nothing about any one brand, so a new theme is covered as soon
as it is listed. The target is WCAG 2.2 AA, which includes every 2.1 A and AA criterion.

| Check | What it catches | Where |
| --- | --- | --- |
| axe scan | Colour contrast, names and labels, ARIA, landmarks, target size &mdash; every axe rule tagged WCAG A/AA | Every page, light and dark |
| axe best practices | Positive `tabindex`, one main landmark, one `h1` | Login pages only: their markup is ours, the consoles' is vendored |
| Keyboard reach | A visible control Tab never reaches (2.1.1) | Every page |
| Focus indicator | A stop whose focused look doesn't differ from its unfocused one, pseudo-elements and `:focus-within` wrappers included (2.4.7) | Every page |
| No trap | Shift+Tab not retracing the Tab order (2.1.2) | Every page |
| Errors | An invalid field whose message isn't referenced by `aria-describedby` or `aria-errormessage` (1.3.1, 3.3.1) | Login |
| Submit | Enter not submitting a form | Login |
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

The console tests have their own config, [`playwright.consoles.config.ts`](../playwright.consoles.config.ts),
so a plain `npx playwright test` never needs Keycloak. Its setup project creates a realm per theme,
`a11y-<theme>`, cloned from `realm-export.json` through the admin REST API as the master `admin`, and never
touches the `nebari` realm. It adds what an empty realm hides &mdash; an identity provider so the Account
Console lists Linked accounts, a group, and the right to view it &mdash; then signs in once per console. The
Admin screens are the ones used most: users, roles, groups, clients, client scopes, realm settings,
authentication, identity providers, user federation, sessions and events.

### Reading a failure

- **axe** failures print one line per element: the rule, its selector, and for contrast the two colours and
  the ratio. Open the page in the dev server (`?preview=<page>&theme=<theme>`) or the console, and find the
  element in devtools.
- **Keyboard** failures name the controls by role and accessible name: `controls that Tab never reaches`,
  `focus stops without a visible focus indicator`, or a diff between the Tab and Shift+Tab orders.
- `npm run test:ui` (login pages and screenshots) or `npm run test:ui:consoles` (Admin and Account) opens
  Playwright's UI mode, which shows each step with a DOM snapshot. The two configs open separately. In the
  consoles window, run the `consoles-setup` tests first if the saved sign-ins are older than Keycloak's
  30-minute idle timeout.

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
