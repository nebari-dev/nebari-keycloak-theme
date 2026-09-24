# Ownership

The Admin and Account consoles come from Keycloakify's `@keycloakify/keycloak-admin-ui` and
`@keycloakify/keycloak-account-ui` packages. On every `npm install`, `keycloakify sync-extensions` copies their
sources into `src/admin/`, `src/account/`, `src/shared/` and `public/keycloak-theme/`. Those copies are
gitignored and overwritten on each install, which is how Keycloak's upstream fixes reach this theme.

**Owning** a file takes it out of that sync. It becomes tracked in git, you can change it, and from then on
**no upstream change will ever reach it again** unless someone merges it in by hand.

That last part is the cost, and it is paid on every Keycloak upgrade. So the rule here is to own as little as
possible, and to guard what stays owned. The reasoning is recorded in
[ADR 0002](adr/0002-restyle-the-consoles-through-a-shim.md) and
[ADR 0004](adr/0004-keep-owned-files-few-and-guarded.md).

## What is owned, and why

Ownership is recorded in the "Owned files" block of [`src/.gitignore`](../src/.gitignore) and
[`public/keycloak-theme/.gitignore`](../public/keycloak-theme/.gitignore). Those two blocks are the source of
truth; this table explains them.

| File | Why it is owned |
| --- | --- |
| `shared/@patternfly/react-core/index.tsx` | The shim every console view imports PatternFly through. Owning this one file restyles ~520 views; see [Architecture](architecture.md#the-consoles-swapping-components-underneath) |
| `shared/keycloak-ui-shared/controls/table/KeycloakDataTable.tsx` | Puts the Nebari data table under the 48 screens that use Keycloak's standard list |
| `shared/keycloak-ui-shared/controls/table/PaginatingTableToolbar.tsx` | The shared search and pager for the ten list views that render their own rows |
| `admin/PageNav.tsx` | The Nebari sidebar, and the seam for a future Software Packs page. [Guarded](#the-upgrade-guards) |
| `admin/PageHeader.tsx` | The Admin header with the shared profile menu |
| `admin/index.css` | Token bridge: restyles whatever stays on PatternFly |
| `admin/page-nav.css` | Narrow bridge between PatternFly's layout shell and the Nebari sidebar |
| `admin/colorScheme.ts` | Applies the theme preference before React mounts |
| `admin/assets/icon.svg` | The Nebari mark on the Admin welcome tab. The asset is owned instead of the component that renders it, because an SVG never gains upstream behaviour and `Dashboard.tsx` changes whenever Keycloak touches that tab |
| `account/KcAccountUi.tsx` | The Account console entry point, which loads the Nebari styles |
| `account/root/Header.tsx`, `account/root/header.module.css` | The Account header with the shared profile menu |
| `account/colorScheme.ts` | Same as the Admin one |
| `public/keycloak-theme/{admin,account}/early-color-scheme.js` | Apply the theme preference before first paint. Must change together with `colorScheme.ts` |

### Handed back

`UserDataTable.tsx`, `UserDataTableToolbarItems.tsx`, `ClientScopesSection.tsx` and `Masthead.tsx` were owned in
the first Admin theme and later handed back. The first three gave two of the 48 list screens a server-side page
count; `Masthead.tsx` served a single caller that was already owned. Four forks maintained across every
Keycloak upgrade was too high a price for that.

## Owning a file

Only do this when the change genuinely can't be made at a seam. In order, try:

1. **The shim**, if the change is about how a PatternFly component looks or behaves everywhere
2. **A token or rule in `src/admin/index.css`**, if it is purely visual
3. **Owning an asset rather than a component**, like `icon.svg` above

If none of those work:

```bash
npx keycloakify own --path "admin/SomeFile.tsx"
```

Then, in the same pull request:

- Say in the description why a seam wasn't enough.
- Add a row to the table above.
- Decide whether it needs a guard. Ask what happens if upstream changes this file and nobody notices. If the
  answer is "a feature silently disappears" rather than "a type error", it probably does &mdash; that is exactly
  what `check-page-nav-sync` exists for.
- Owned files keep the `@ts-nocheck` they were vendored with. If you rewrite one substantially, consider removing
  it so the type check covers your code.

## Handing a file back

```bash
npx keycloakify own --path "admin/SomeFile.tsx" --revert
git rm --cached src/admin/SomeFile.tsx
```

**Both steps matter.** `--revert` restores the upstream content and moves the path back under the package's
ignore block, but `.gitignore` doesn't untrack a file that is already tracked. Skip the `git rm --cached` and the
file stays in git, so the first time `sync-extensions` pulls an upstream change it shows up as a modified
tracked file &mdash; the opposite of what handing it back was for. That happened with all four of the files
above.

## The upgrade guards

Two scripts run on every build and in CI, each covering a way an owned file can break without any error:

- **`check:page-nav-sync`** fails if Keycloak adds a console section that the owned `PageNav.tsx` doesn't render.
- **`check:patternfly-version`** fails if PatternFly's major version moves while files still reference the old
  one.

What they check and how to respond when they fail is in
[Development](development.md#upgrade-guards).

## Upgrading Keycloak

A Keycloak bump arrives as a bump of the `@keycloakify/keycloak-admin-ui` and `@keycloakify/keycloak-account-ui`
packages. Dependabot ignores both on purpose, so it is always a deliberate, hand-made change.

1. Bump both packages together, and `@keycloak/keycloak-admin-client` if required.
2. `npm install`. This re-syncs every unowned file.
3. `npm run check`. A failure here is the guards doing their job &mdash; reconcile it rather than silencing it.
4. For each owned file, diff it against the new upstream original in `node_modules/@keycloakify/...` and merge in
   what changed. This is the manual cost ownership buys.
5. Check both consoles in the [compose loop](quick-start.md#the-compose-loop-consoles), since CI can't.
