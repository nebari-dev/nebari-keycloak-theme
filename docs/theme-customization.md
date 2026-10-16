# Theme customization

The Admin Console carries a **Theme customization** page (sidebar: *Configure &rarr; Theme customization*,
route `#/<realm>/branding`) where a realm admin with `manage-realm` can rebrand the login pages without
rebuilding the theme: company name, light and dark logos and backgrounds, palettes, card radius, colour
scheme and which login methods are shown. Changes are previewed before they are published, and a draft can be
exported to and imported from JSON.

This page explains the two login themes the editor works with, how a published theme is stored, and the
constraints anyone changing it needs to know.

## Themes

The build ships two login themes, **each in its own JAR**, selected per realm by
Keycloak's **Login theme** setting:

| Theme | Components | Branding | For |
| --- | --- | --- | --- |
| `template` | stock shadcn/ui (Radix) | none | the default — a starting point to customize |
| `nebari` | Nebari registry (Base UI) | Nebari logo and palette | Nebari's own deployments |

### The registry

A theme is registered in exactly two places, and they are checked against each
other rather than left to agree by convention:

- **[`themes.json`](../themes.json)** — the names, in packaging order. Read by
  [`vite.config.ts`](../vite.config.ts) and
  [`scripts/build-keycloak-themes.mjs`](../scripts/build-keycloak-themes.mjs),
  which run in Node and cannot import the app's React-typed modules.
- **`THEME_CATALOG` in
  [`src/themes/themeCatalog.ts`](../src/themes/themeCatalog.ts)** — the metadata,
  keyed by those names. The key *is* the name, so a definition cannot disagree
  with its own identity.

`themeCatalog.ts` derives `CUSTOM_THEME_NAMES` from `themes.json` and throws at
module load if either side has a name the other lacks. A name in `themes.json`
with no catalog entry would package a theme whose login pages silently fall back
to another theme's; a catalog entry missing from `themes.json` would work in dev
and never reach a JAR. Both are quiet failures, so they are made loud.

**Adding a theme** is therefore:

1. Add the name to `themes.json` — position matters only for the first entry,
   which is the default.
2. Add its entry to `THEME_CATALOG`: `componentSet` picks which login pages it
   renders, `logo` is used by all three consoles, `themeCustomization` decides
   whether its Admin Console carries the editor, `defaultBranding` is its
   palette.
3. Add its pages under `src/login/` if it needs its own, and register the set in
   [`src/login/uiSets.ts`](../src/login/uiSets.ts). A theme that reuses an existing
   component set needs neither.

Nothing else. The build script, the JAR names, the CI release table, the Admin
Console masthead and the theme.properties switches all follow from those two
files.

`template` is the default because it is *first* in `themes.json`:
`DEFAULT_THEME_NAME` is `CUSTOM_THEME_NAMES[0]`, which is also the theme
keycloakify packages as primary. A realm that has not chosen a theme therefore
gets the unbranded one rather than someone else's branding, and the two meanings
of "default" cannot drift apart.

The two are not interchangeable at the component level — Base UI's
`<FieldError match={…}>` has no Radix equivalent — so each owns its own pages.
[`src/login/uiSets.ts`](../src/login/uiSets.ts) picks the whole set once from the
theme name and `KcPage` renders it. Every member is `lazy`, so a realm only
downloads the theme it uses.

### The `template` theme

Deliberately unbranded: no logo, no wordmark, no accent hue. Its palette is
stock shadcn's `neutral` base (Tailwind's `neutral` scale), so the primary is a
near-black in light mode and near-white in dark. A logo appears only once a
deployment uploads one in **Theme customization**, so nothing has to be removed
first.

The neutral starting point is still production-ready rather than a bare
component demo. Page, card and input surfaces are separate; every visible form
control paints `inputBackground`; and the neutral-500 border gives unfocused
controls at least 3:1 non-text contrast against both card and input surfaces in
light and dark mode. Error text uses a mode-specific neutral-theme red with at
least 4.5:1 text contrast. These defaults are browser-tested as well as captured
in the screenshot suite. An admin can deliberately replace any colour in
**Theme customization**, so imported or hand-edited palettes should preserve
the same contrast relationships.

- Shell and pages: [`src/login/template/`](../src/login/template/) — start with
  `Template.tsx`, which owns the background, the card and the logo slot.
- Components: [`src/components/shadcn/`](../src/components/shadcn/), kept separate
  from the Nebari registry in `src/components/ui/` so
  `npx shadcn@latest add <component>` yields matching components.
- Defaults: `TEMPLATE_BRANDING_CONFIG` in
  [`src/branding/brandingConfig.ts`](../src/branding/brandingConfig.ts), mirrored
  for import as `custom_themes/template-default.json`.

Because it is unbranded it cannot reuse the Nebari-branded message overrides in
`src/login/i18n.ts` — custom translations replace a message for every theme in
the build, so neutral wording needs its own key (`templateRegisterTitle`).
Stock shadcn components also assume their initializer's global
`border-border` base rule. This project supplies the equivalent under
`[data-login-theme="template"]` only, so generated Card, Alert and outline
Button borders receive the configured token without leaking into the Nebari
theme or Keycloak consoles. Keep that rule scoped when adding more shadcn
components. The shared shell also supplies the page's `<main>` landmark and
semantic `<h1>`; individual flow pages provide the localized heading text.


## Branding the consoles

The Admin and Account consoles are PatternFly, re-skinned onto the design
system's tokens by the bridge in
[`src/admin/index.css`](../src/admin/index.css). Every theme shares that skin —
what varies per theme is the mark in the masthead, not the palette.

The Admin Console masthead takes the first of:

1. the live preview, while an admin is editing under **Realm settings → Themes**;
2. `logo` from the theme's `theme.properties` — Keycloak's own hook, so a
   deployment can point at its own file by layering a child theme, with no
   rebuild;
3. **the realm's published console logo**, set in **Theme customization** under
   *Console header logos*. That group has its own light and dark artwork plus a
   **Use the login card logos** checkbox, on by default — so one mark can serve
   both surfaces, or the console can have its own. It arrives through the
   realm's localization messages, which the console's i18n already loads before
   first paint, so it needs no fetch of its own and cannot flash;
4. `ThemeDefinition.logo` for the theme Keycloak is rendering, read from the
   same catalog the login pages use — `kcContext.themeName` is injected into
   both consoles, so a theme cannot brand one and not the other;
5. otherwise the realm's display name, as a wordmark.

Steps 1–4 are resolved by
[`src/branding/consoleLogo.ts`](../src/branding/consoleLogo.ts), shared by both
consoles so they cannot disagree.

`useLoginLogoInConsole` defaults to **true**, which is what a realm that
published before the field existed normalizes to — so adding it changed nothing
for existing realms. Turn it off and `consoleLogo` is used instead, which is
worth doing when a login-card mark looks cramped in a 32px-tall masthead.

Step 5 is why the unbranded `template` theme does not show someone else's logo
in either console.

The Account console runs the same resolver and, like the Admin Console, falls back to the realm name when
a theme ships no artwork and nothing is published.

## Turning the Theme customization page off

Not every deployment wants the editor. Two layers decide, in
[`src/admin/themeCustomization.ts`](../src/admin/themeCustomization.ts):

| | Where | Effect |
| --- | --- | --- |
| Per theme | `themeCustomization` in `THEME_CATALOG` | Baked into that theme's `theme.properties` at build time. Because each theme is packaged into its own JAR, a theme with no use for the editor ships without it. |
| Per deployment | `NEBARI_THEME_CUSTOMIZATION=enabled\|disabled` | An environment variable on the Keycloak container, resolved by Keycloak when it renders the page. Overrides the theme. No rebuild, no realm change. |

Dropping the route in [`src/admin/routes.tsx`](../src/admin/routes.tsx) is the
whole gate: `LeftNav` renders nothing for a path it cannot find among the
routes, so the sidebar entry goes with it, and a hand-typed
`#/<realm>/branding` lands on the not-found page.

This hides the editor rather than revoking anything. The published config lives
in the realm's localization messages, which any holder of `manage-realm` can
still write through the Admin API, and the login pages go on honouring what is
already published. Treat it as a deployment deciding the page is not part of its
product, not as an access control.

Both values arrive as `kcContext.properties`, which is how Keycloak hands
`theme.properties` to the console. Keys beginning with `kc`, plus `locales`,
`import`, `meta` and `accountResourceProvider`, are filtered out of that object
by the generated FTL — do not name a property `kc*`.

## Runtime login branding

When the Nebari Admin Console theme is active, administrators can open
**Theme customization** to edit the login palette, company name, logo,
background image, card radius, default color scheme, and available login
methods. Logos and backgrounds can differ between light and dark appearances.
Changes are previewed before they are published.

Uploaded PNG, JPEG and WebP files open in a crop editor before they enter the
draft. It supports original, wordmark, square and common landscape frames,
pointer dragging, keyboard positioning, and 100–300% zoom. Applying the crop
converts the source-pixel selection to WebP and bounds it to 640×240 for logos or
1600×1000 for backgrounds. Logos use a smaller storage budget because two may
be stored alongside the backgrounds. Hosted image URLs bypass local cropping
and are used as supplied.

Each asset has **Light appearance** and **Dark appearance** values. An empty
variant falls back to its sibling, so a deployment can upload one universal
asset or a contrast-safe pair. The editor preview and both login component sets
resolve the same fallback, preventing a white wordmark from disappearing on a
light card without requiring every realm to upload two files.

Published settings are stored in the realm's localization messages under the
`nebariBrandingConfig` key and are applied to subsequent login page loads
without rebuilding the theme.

Unlike the vendored console views, this page is locally owned, so it is built
from the design-system components directly — `Card`, `Field`, `Input`, `Select`,
`Slider`, `Button`, `Alert`, `DropdownMenu`, `Dialog`. Only `PageSection` is
still PatternFly, because it supplies the page chrome every other console page
sits in. `branding.css` owns page layout plus the surfaces that have no matching
component: the native colour swatch, preview panel, and crop viewport. Dialog,
form-control, button, select, and slider states remain design-system owned.

### Where a published theme lives, and how to make it survive

Publishing writes the config into the realm's **localization messages**, so it
lives in Keycloak's database. That has one consequence worth knowing before
relying on it:

| | |
|---|---|
| Container restart | **Survives** — the data is in the Postgres volume |
| Fresh database / new deployment | **Lost** — falls back to `DEFAULT_BRANDING_CONFIG` |
| In the theme JAR or the repo | **No** |

`--import-realm` only seeds an empty database, and `realm-export.json` carries no
`localizationTexts`, so a clean instance always starts unbranded.

### It is stored once per locale, and the copies can disagree

A localization message belongs to a locale, so the config is written under every
locale the realm supports plus `en`. That is
[`src/branding/localeVariants.ts`](../src/branding/localeVariants.ts), and three
hazards follow from it — all covered by
[`tests/localeVariants.spec.ts`](../tests/localeVariants.spec.ts):

- **Never trust the default locale alone.** Change a realm's default locale to
  one that was never published to and it reads empty. Treating that as the truth
  would show the editor a set of theme defaults indistinguishable from an
  unbranded realm, and the next publish would write those defaults over the real
  config in every other locale. So the editor reads *all* locales first and a
  populated value always outranks an empty one.
- **Two populated values that disagree are not a guess.** The editor refuses to
  open and asks which to keep, previewing each, because either answer discards a
  theme somebody published.
- **Publishing is also the repair.** A locale added after the last publish, or a
  publish that failed part way, leaves locales behind while the draft still
  equals the published config — so Publish is enabled whenever locales are out
  of sync, not only when the draft is dirty. There is no multi-locale write to
  make it atomic; the writes are sequential, failures are reported per locale,
  and retrying is idempotent.
- **A locale that could not be read is not an empty locale.** They mean opposite
  things — nothing was published there, versus it may hold anything, including
  the realm's only copy. `readLocaleVariants` therefore reports failed reads
  separately, and finding no theme while some locale was unreadable is treated
  as *unknown*, not unbranded: the editor stays closed, exactly as for a failed
  load. Folding the two together is what would let a transient outage present
  as an unbranded realm and invite an overwrite.

**⋮ → Export theme as JSON** is what closes that gap. Save the file into
[`custom_themes/`](../custom_themes/README.md) at the project root and commit it: it
ships inside the theme JAR, ready to re-import into any realm. The directory is
read with `import.meta.glob('/custom_themes/*.json')`, so there is no index to
maintain — see its README for the file format.

A page cannot write to a path of its own choosing, so where the file lands is the
browser's decision. Chromium exposes `showSaveFilePicker`, which lets the admin
save straight into `custom_themes/` and remembers that directory for next time;
Firefox and Safari fall back to an ordinary download that has to be moved.

**⋮ → Import theme…** lists those presets alongside a file picker, and
previews the selected theme with the same `BrandingPreview` the editor uses
before anything is applied. Importing replaces the *draft* only; publishing stays
a separate step, so an import can still be discarded.

Imported JSON is untrusted and always goes through `normalizeBrandingConfig`,
which is the same validator the published config passes through.

`BrandingConfig` version 2 stores `logo` and `backgroundImage` as
`{ light, dark }` image sets. Version 1 imports and already-published realm values
remain supported: their single string is expanded to both appearances during
normalization, so upgrading does not change what users see. The next publish or
export writes the normalized version 2 shape.

Branding reaches the page as **CSS custom properties**, set inline on the login
wrapper by `getBrandingCssVariables` — `--card`, `--primary`, `--input`,
`--ring` and friends, which the design-system components already read.

For the **Nebari theme**, the branding layer is gated on `[data-branded]`, which
its `Template` sets only when `isBrandingCustomized` finds a published config
that differs from the theme's defaults. An unbranded Nebari realm therefore gets
neither the inline variables nor the `[data-branded]` rules in `src/theme.css`
and renders byte-identically to a build without runtime branding. Keep that gate:
without it, the editor would restyle every existing Nebari login page whether or
not anyone asked for branding.

The **template theme** always applies its selected palette as shadcn tokens on
its own `<main>`. That is intentional: the shared `:root` tokens are Nebari's,
so an unconfigured template realm must actively establish its neutral defaults
instead of inheriting purple. Its variables remain local to the login shell and
do not need the Nebari-specific `[data-branded]` CSS bridge.

Add branded styling under `.nebari-login-wrapper[data-branded]`, never to the
unscoped selectors. The login stylesheet's own element selectors
(`input[type="text"]`, `button[type="submit"]`) are unlayered, so they outrank a
component's own state rules — the `[data-branded]` block re-states the few
declarations branding needs to win, such as taking the focus border from `--ring`
instead of `--accent`.

Three constraints on the palette are easy to break:

- **Each theme's defaults must equal its intended component tokens.** They are the baseline
  the `[data-branded]` gate compares against, and the starting point when an
  admin edits a single colour — so an approximation would shift every untouched
  colour the moment a realm brands anything. `DEFAULT_BRANDING_CONFIG` holds the
  Nebari tokens rasterised to sRGB hex; `TEMPLATE_BRANDING_CONFIG` holds the
  neutral template palette, with stronger neutral borders for accessible control
  boundaries.
- **Values must stay `#rrggbb`.** The wrapper's background-image gradient
  concatenates an alpha suffix onto `pageBackground`, which only parses on
  6-digit hex — not `oklch()`.
- **Defaults describe an unbranded realm**, so they have to reproduce existing
  behaviour: `colorScheme: "system"` (the stylesheet's own
  `prefers-color-scheme` rules assume it, and the inline variables would
  otherwise pin the page to one mode) and `loginMode: "password-and-providers"`
  (anything else hides the password form on realms that have social providers).

`--primary-foreground` is derived from the chosen primary by WCAG contrast
rather than stored, so an admin picking a light brand colour still gets a
readable button label.

`--accent` is **overloaded**, and it will bite anyone touching hover states: the
older login CSS treats it as the brand purple and defines it on `[data-theme]`,
which `main.tsx` always stamps, so it outranks the `:root` token that the design
system means by it (a muted hover surface). Every design-system hover state in
both consoles therefore renders brand purple — plain and control button hovers,
the current vertical tab, selected table rows, selected menu items, and this
page's own `⋮` trigger while its menu is open. Fixing it means moving the legacy
consumers onto `--primary` and dropping `--accent` from the `[data-theme]`
blocks, which changes login-page pixels — so it belongs with the login/admin
theme work, not here. Inside `[data-branded]`, use `--ring` for focus and
`--primary` for brand colour and the ambiguity does not arise.

## Known gaps

- `src/account/nebari-account.css` is a separate, older restyling of PatternFly
  using hardcoded hex values rather than tokens. The Account console will not be
  fully consistent until it is converted.
- `.nebari-*` classes and the design-system components are two ways of styling
  the same thing. They are kept in step by hand because `UserProfileFormFields`
  needs the class-based path; prefer the components for anything new.
- Uploaded branding images are cropped, compressed and stored inline in the
  realm's localization messages. Per-kind storage limits keep paired artwork
  bounded, but object storage remains preferable for large production asset
  libraries.
- The registry's components take `ref` as a plain prop (the React 19
  convention) and this app is on React 18, where a function component cannot
  receive one. `ProfileMenu` works around it for its menu trigger by rendering a
  DOM element via `render`; the same applies to `Tooltip`, which is why the
  PatternFly tooltip is still in use.
