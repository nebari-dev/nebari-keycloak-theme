# AGENTS.md

Working agreement for coding agents in this repo. Read it before touching code.

## What this is

A Keycloakify v11 theme for Nebari. [`themes.json`](themes.json) lists the themes it builds, `nebari` and the
unbranded `template`; each is packaged in its own JAR with three Keycloak themes under its name: the **login**
pages, the **Account** console and the **Admin** console. Every push to `main` publishes both in the multi-arch
image `quay.io/nebari/nebari-keycloak-theme`.

- The login theme (`src/login/`) is written in this repo on the `@nebari` design-system components.
- `src/main.tsx` stamps the theme name on `<html>` as `data-brand` and the theme type as `data-kc-theme-type`.
  Each theme's logo, default palette and editor switch live in the catalog,
  [`src/themes/themeCatalog.ts`](src/themes/themeCatalog.ts), checked against `themes.json` at build time.
- **Downstream brands don't live here.** A brand built on this theme ships as a Theme customization preset or as
  a child theme in its own repo; see [`docs/theme-customization.md`](docs/theme-customization.md) and
  [`docs/child-themes.md`](docs/child-themes.md).
- **Runtime branding input is untrusted.** Anything that reaches the login page from the Theme customization
  editor, an imported JSON file or the realm's localization messages goes through `normalizeBrandingConfig`.
  Never render it as HTML or CSS text; see [`docs/theme-customization.md`](docs/theme-customization.md).
- **The child-theme contract is public API.** `data-brand`, `data-kc-theme-type`, `data-theme`, the custom
  properties on `:root` in `src/theme.css`, the `dist/logo/` paths and the `brand`, `styles` and
  `messageOverrides` theme properties are what downstream themes build on. Renaming or removing one breaks them;
  see [`docs/adr/0006-support-child-themes.md`](docs/adr/0006-support-child-themes.md).
- The consoles are ~520 views vendored from Keycloak by `keycloakify sync-extensions`. They are **not rewritten**.
  They are restyled by swapping the components they import underneath them, through one owned re-export shim.

Start with [`docs/architecture.md`](docs/architecture.md). The decisions behind the current shape are in
[`docs/adr/`](docs/adr/).

## Commands

Node `^20.19` or `>=22.12`.

```sh
npm install                          # also re-syncs the vendored console sources
npm run dev                          # login pages at :5173, e.g. /?preview=login
npm run check                        # upgrade guards
npm run typecheck                    # tsc --noEmit
npm run test:screenshots             # compare login pages against Linux baselines, per brand
npm run build-keycloak-theme         # guards + tsc + vite build + one JAR pair per brand in dist_keycloak/
docker compose up -d --build keycloak   # consoles, on the nebari realm
```

## Hard rules

- **Never edit `src/components/ui/` or the registry hooks in `src/hooks/`.** `shadcn add` overwrites them. Change
  a component at the call site (`className`, Base UI `render`) or wrap it under `src/components/nebari/`.
- **Don't hand-edit generated files.** `src/kc.gen.tsx` and the Keycloakify-managed blocks in `src/.gitignore` and
  `public/keycloak-theme/.gitignore` are written by Keycloakify. Change ownership with `npx keycloakify own`, not by
  editing the ignore blocks.
- **Don't own a file to make a change a seam could make.** Owning takes a file out of upstream sync permanently and
  costs a manual merge on every Keycloak upgrade. Try the shim, then `src/admin/index.css`, then owning an asset.
  Read [`docs/ownership.md`](docs/ownership.md) first, and add the file to its table if you do own one.
- **Handing a file back is two steps:** `npx keycloakify own --path <p> --revert`, then `git rm --cached`.
  `.gitignore` doesn't untrack.
- **An adapter in `src/components/patternfly/` must match PatternFly's public API exactly** &mdash; argument order,
  prop precedence, refs. Hundreds of vendored views depend on it and none of them are in your diff.
- **Every new CSS rule needs a cascade-layer decision.** Unlayered CSS beats every layer regardless of specificity.
  See [`docs/architecture.md`](docs/architecture.md#cascade-layers).
- **`colorScheme.ts` and the matching `public/keycloak-theme/*/early-color-scheme.js` change together.**

## Verify, don't assume

- **The dev server can't show the consoles.** They need a real Keycloak. Rebuild the JAR *and* the image &mdash;
  `docker compose up -d --build keycloak` &mdash; and sign in on the `nebari` realm, not `master`. Forgetting
  `--build` makes it look like nothing changed.
- **Nothing tests the consoles automatically.** CI covers login-page pixels, the type check and the guards. For a
  console change, check it in the compose loop and say in the pull request that you did.
- **A green type check covers `src/` only.** The owned console files are type-checked, but nothing under
  `tests/` or the Playwright config is: Playwright transpiles without checking types.
- **A rebaselined screenshot is a claim that the new rendering is right.** Look at the diff before committing it.
  Regenerate baselines on Linux, or in the Playwright container documented in
  [`docs/development.md`](docs/development.md#regenerate-baselines-on-linux).
- **If you change a guard, prove it can still fail.** Construct the failure it exists to catch and run it. Reading
  the script isn't enough.
- **Check upstream before claiming behaviour.** The vendored originals are in `node_modules/@keycloakify/`. Diff an
  owned file against its original rather than guessing what changed.

## Mistakes already made here

Each of these shipped or nearly shipped. Don't repeat them.

- A local edit to a registry component was silently overwritten by the next `shadcn add`.
- A bare `:not([data-slot])` in a login-page selector counted as an attribute selector, beat
  `.nebari-social-button`, and turned the social sign-in buttons purple &mdash; and the baseline was regenerated in
  the same commit, so CI passed. Wrap it: `:where(:not([data-slot]))`.
- An unlayered rule in `src/admin/index.css` beat Tailwind's `hidden` and pinned an error icon onto every valid field.
- The Checkbox and Switch adapters passed Base UI's `eventDetails` wrapper as if it were an event, so react-hook-form
  stored the wrapper object as the field's value.
- The owned data table defaulted `showRowActions` to `false`, which removed the row menu &mdash; and with it delete
  and edit &mdash; from every Admin list screen.
- Four files were handed back to Keycloakify but left tracked in git.
- The navigation guard matched raw source, so commenting out a `<LeftNav>` made it pass with the section missing.

## Docs

The README is an overview; depth lives in [`docs/`](docs/). When a change makes a doc wrong, fix the doc in the same
pull request &mdash; the README's project-layout and documentation tables, and the owned-file table in
[`docs/ownership.md`](docs/ownership.md), are the ones that rot quietly.

A real choice between alternatives gets an ADR in [`docs/adr/`](docs/adr/), numbered in sequence and append-only.
To change a decision, add a record that supersedes the old one.
