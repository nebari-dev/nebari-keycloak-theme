# Nebari Keycloak Theme

A custom Keycloak theme for Nebari using [Keycloakify](https://www.keycloakify.dev/).

## Features

- ✨ Custom Nebari branding with color scheme
- 🎨 Light and dark theme support
- 📱 Fully responsive design
- 🔐 Customized login, registration, and error pages
- 🧭 Nebari-styled Keycloak Admin Console
- 🌐 Internationalization ready

## Prerequisites

- Node.js 18+ and npm
- A running Keycloak instance (version 22+ recommended)

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm run dev
```

Open http://localhost:5173 to see the theme in your browser.

Any login page can be previewed standalone with the `preview` query parameter,
which feeds a mock `kcContext` to the app — for example
http://localhost:5173/?preview=register. The available names are listed in
`getKcContextMockForPreview` in [src/login/KcContext.ts](src/login/KcContext.ts).

Add `theme` to choose which theme renders it —
`?preview=login&theme=template` or `?preview=login&theme=nebari`. The mock
reports a theme name that matches nothing in the catalog, so an unpinned preview
shows whichever theme is currently the default.

### Working on the Admin or Account console

**The dev server cannot show these.** Both consoles authenticate against a real
Keycloak, so there is no mock `kcContext` to preview them with — and the themes
are delivered as JARs baked into the image at build time, so restarting the
container is not enough either. Rebuild the JARs and the image:

```bash
npm run build-keycloak-theme
docker compose up -d --build keycloak
```

`start-dev` disables Keycloak's theme cache, so a fresh image is all that is
needed. `--build` is the part that is easy to forget: without it the container
starts from the previously baked JAR and nothing appears to change.

The image installs **every** theme that was built (`THEME_JAR` in the
[Dockerfile](Dockerfile) defaults to a glob), so a realm can be switched between
them without rebuilding — build only one with
`npm run build-keycloak-theme -- --theme <name>` and a realm pointing at any
other silently falls back to stock Keycloak.

A theme is selected per realm, and only the imported `nebari` realm selects this
one — `master` still runs the stock consoles. So open the themed consoles on
`nebari`, each with its own account:

| Console | URL | Sign in as |
| --- | --- | --- |
| Admin | http://localhost:8080/admin/nebari/console/ | `nebari-admin` / `nebari-admin` |
| Account | http://localhost:8080/realms/nebari/account/ | `demo` / `demo` |

`admin` / `admin` from `docker-compose.yml` is the *master* realm's bootstrap
admin. It can administer the `nebari` realm, but only through
http://localhost:8080/admin/master/console/, which renders in master's own
(stock) theme — a Keycloak session belongs to the realm it was created in. That
is why `realm-export.json` also seeds `nebari-admin`, a user in the `nebari`
realm holding the built-in `realm-management` → `realm-admin` role: signing in as
that user is what renders the themed Admin Console with every section present.

> `realm-export.json` is development-only. `docker-compose.yml` mounts it for
> `--import-realm`; the `Dockerfile` copies **only** the theme JAR, so neither
> these credentials nor this realm reach the published image.

`realm-export.json` sets all three themes (*Login theme*, *Admin console theme*,
*Account theme*) to `nebari`. Any other realm has to select them by hand under
**Realm settings → Themes**.

### Upgrade guards

`npm run check` runs as part of both `npm run typecheck` and `npm run build`, and
covers the two ways this theme can break *silently* on a Keycloak bump — neither
of which `tsc` can see:

- **`check:page-nav-sync`** — the Admin navigation is the single owned routing
  seam, reserved for the planned
  [Software Packs page](https://github.com/nebari-dev/nebari-keycloak-theme/issues/14).
  Owned files are the ones `keycloakify sync-extensions` will not refresh, so a
  console section Keycloak adds upstream would simply never appear here. The
  check compares the static `<LeftNav>` destinations *and* the number of render
  sites (which catches a section added with a computed path), and fails on a
  dropped section or on a destination not declared in the script's `NEBARI_ONLY`
  allowlist.
- **`check:patternfly-version`** — around 400 selectors in this theme name
  PatternFly's classes directly (`.pf-v5-c-table`, `--pf-v5-global--*`). When
  Keycloak moves to PatternFly 6 those all become `pf-v6-*` and every selector
  stops matching, with no error anywhere. The check compares the *installed*
  PatternFly major against every `pf-vN-` reference in tracked files and fails on
  a mismatch. Treat that failure as a port, not a version bump.

Neither guard covers the Admin or Account console visually — the screenshot
baselines below are login pages only. That gap is why both of these exist.

## Visual Tests

The login pages are captured as screenshots and compared on every pull request.

```bash
# Compare the theme against the committed baselines
npm run test:screenshots

# Accept the current rendering as the new baselines
npm run test:screenshots:update
```

Baselines live in `tests/screenshots/<platform>/` because each OS rasterises
fonts slightly differently. CI runs on Linux, so **regenerate baselines on Linux**
— snapshots updated on macOS or Windows are written to a different directory and
will not satisfy the check. If you are not on Linux, run the update inside the
matching Playwright container:

```bash
docker run --rm -v "$PWD":/work -w /work --ipc=host \
  mcr.microsoft.com/playwright:v1.62.1-noble \
  npm run test:screenshots:update
```

Every CI run also uploads a `theme-screenshots` artifact with the screenshots
that branch actually produced, so reviewers can see the theme without checking
it out.

## Building the Theme

```bash
# Build every theme
npm run build-keycloak-theme

# Or just one
npm run build-keycloak-theme -- --theme nebari
npm run build-keycloak-theme -- --list
```

**Each theme is packaged into its own JAR**, so a consumer downloads only the
theme they use rather than every theme in the repository. For each theme in
[`themes.json`](themes.json) the build writes two files to `dist_keycloak/`:

| File | Target |
| --- | --- |
| `<theme>-keycloak-theme-for-kc-all-other-versions.jar` | Keycloak 26 and newer |
| `<theme>-keycloak-theme-for-kc-22-to-25.jar` | Keycloak 22 to 25 |

With `template` and `nebari` that is four JARs of about 12 MB each, against
24 MB for a combined one — every theme subtree carries its own copy of the
login, admin and account bundles, so packaging them separately halves what a
consumer downloads, and keeps it flat as themes are added.

[`scripts/build-keycloak-themes.mjs`](scripts/build-keycloak-themes.mjs) drives
this. It compiles the app once, then runs `keycloakify build` per theme with
`KEYCLOAKIFY_THEME_NAME` set, which is what narrows
[`vite.config.ts`](vite.config.ts)'s `themeName` to a single entry. Every JAR is
then reopened and rejected unless it contains exactly one `theme/<name>/`
directory *and* advertises exactly that one theme in
`META-INF/keycloak-themes.json` — a theme leaking into another's JAR fails the
build rather than shipping. JARs for themes you did not select with `--theme`
are left in place, and `src/kc.gen.tsx` is restored afterwards, since resolving
the Vite config rewrites it for whichever theme is being packaged.

## Releasing

Pushing to `main` runs
[publish-keycloak-image.yml](.github/workflows/publish-keycloak-image.yml), which
builds every theme's JARs and republishes the container image to
`ghcr.io/<owner>/<repo>` tagged `latest`, `sha-<commit>` and the `version` from
`package.json`. The published image carries every theme, so a realm can switch between them
without a new image; the per-theme JARs attached to the release are the
size-sensitive channel. Pass `THEME_JAR` as a build arg to publish an image
carrying just one.

It also cuts a GitHub release for `v<version>`. The only assets are the JARs —
that is all a consumer needs to install a theme, and each is downloadable on its
own. The install table in the release notes is generated from `themes.json`, so
adding a theme needs no workflow edit. The screenshots are
embedded in the release notes as links to this repository rather than attached,
so the release page shows what the theme looks like without carrying the weight.
A release is only created when `v<version>` does not already exist, so **bump
`version` in `package.json` to publish a new one**; otherwise the run just
refreshes the image and logs a notice.

The embedded screenshots only render once the repository is public —
`raw.githubusercontent.com` does not accept browser session cookies, and GitHub
fetches external images server-side without the viewer's credentials. Until then
the notes fall back to a link to the screenshot directory at the release commit.

Note that GitHub always attaches its own auto-generated `Source code` archives to
every release; those cannot be turned off.

## Deployment

### Option 1: Manual Deployment

1. Build the theme:
   ```bash
   npm run build-keycloak-theme
   ```

2. Locate the JAR for the theme you want:
   ```bash
   ls dist_keycloak/*-keycloak-theme-*.jar
   ```

3. Copy that one JAR to your Keycloak deployment — installing a theme you do
   not use only adds weight:
   ```bash
   # For standalone Keycloak
   cp dist_keycloak/nebari-keycloak-theme-for-kc-all-other-versions.jar /path/to/keycloak/providers/

   # For containerized Keycloak (Docker/Kubernetes)
   kubectl cp dist_keycloak/nebari-keycloak-theme-for-kc-all-other-versions.jar <keycloak-pod>:/opt/keycloak/providers/
   ```

4. Restart Keycloak to load the theme:
   ```bash
   # Standalone
   /path/to/keycloak/bin/kc.sh start

   # Kubernetes
   kubectl rollout restart deployment/keycloak
   ```

### Option 2: Kubernetes with ConfigMap/Volume

1. Build the theme and extract contents:
   ```bash
   npm run build-keycloak-theme
   mkdir -p theme-extracted
   unzip dist_keycloak/nebari-keycloak-theme-for-kc-all-other-versions.jar -d theme-extracted/
   ```

2. Create a ConfigMap:
   ```bash
   kubectl create configmap nebari-keycloak-theme \
     --from-file=theme-extracted/theme/nebari/
   ```

3. Mount in Keycloak deployment:
   ```yaml
   spec:
     containers:
     - name: keycloak
       volumeMounts:
       - name: nebari-theme
         mountPath: /opt/keycloak/themes/nebari
     volumes:
     - name: nebari-theme
       configMap:
         name: nebari-keycloak-theme
   ```

### Option 3: Build Custom Keycloak Image

Create a `Dockerfile`:

```dockerfile
FROM quay.io/keycloak/keycloak:latest

# Copy the JAR for the theme you want
COPY dist_keycloak/nebari-keycloak-theme-for-kc-all-other-versions.jar /opt/keycloak/providers/

# Build the Keycloak image with the provider
RUN /opt/keycloak/bin/kc.sh build
```

Build and push:
```bash
docker build -t your-registry/keycloak-nebari:latest .
docker push your-registry/keycloak-nebari:latest
```

## Configuring Keycloak to Use the Theme

1. Login to Keycloak Admin Console

2. Navigate to your realm (e.g., `nebari`)

3. Go to **Realm Settings** → **Themes**

4. Set the following:
   - **Login theme**: `nebari`
   - **Admin console theme**: `nebari`
   - **Account theme**: `nebari` (optional)
   - **Email theme**: `nebari` (optional)

5. Click **Save**

## Customization

### Design system components

Components come from the [Nebari Design registry](https://nebari-dev.github.io/nebari-design/),
a shadcn registry registered as `@nebari` in `components.json`:

```bash
npx shadcn add @nebari/<name>          # list them: curl .../r/registry.json
```

Everything under `src/components/ui/` and `src/hooks/` is **upstream-managed**.
`shadcn add` regenerates those files, so a local edit is silently lost on the
next upgrade — which has already happened once in this repo. Change look or
behaviour at the call site instead: pass `className`, swap the element with the
Base UI `render` prop, or add a wrapper of your own under
`src/components/nebari/`.

Two deviations are unavoidable, and `shadcn add` will revert both — `tsc` fails
loudly when it does, so they are not silent:

- **`children as ReactNode` casts** in `button.tsx` and `dialog.tsx`. The
  vendored `src/admin/i18next.d.ts` sets react-i18next's
  `allowObjectInHTMLChildren: true`, which widens every element's `children` type
  globally, so registry code that assigns `children` to a `ReactNode` does not
  compile here. Interface merging cannot narrow it back, and the flag's own TODO
  says removing it produces too many errors across the ~520 vendored views.
- **`DropdownMenuTrigger` needs `render={<button />}`** at every call site. The
  registry's trigger renders the Nebari `Button`, which takes `ref` as a plain
  prop (React 19); on React 18 that ref never reaches a DOM node, so Base UI's
  anchor is null and the menu does not position itself. Pass
  `buttonVariants({ variant })` as `className` to keep the styling, and pass
  `variant` too so the trigger's own variant classes match.

The Admin Console sidebar is installed from that registry as
[`src/components/ui/sidebar.tsx`](src/components/ui/sidebar.tsx). Its composition
lives in [`src/admin/PageNav.tsx`](src/admin/PageNav.tsx): access checks still
decide which Keycloak routes appear, while Nebari's `SidebarHeader`, groups,
menus, menu buttons, active states and tokens provide the presentation. The
menu-button composition removes the component's surface-coloured focus offset
so every item has one purple `radius-md` focus ring in both colour themes. The
outer PatternFly `PageSidebar` is intentionally only a responsive layout shell;
it keeps Keycloak's existing desktop/mobile open state and contains no visible
navigation controls. When that shell is closed, the composition mirrors its
state to the navigation's `inert` attribute so off-canvas links cannot receive
keyboard focus or appear in the accessibility tree.
[`src/admin/page-nav.css`](src/admin/page-nav.css) documents that narrow bridge
and should not grow into a second sidebar theme.

The Admin Console's standard resource lists use the registry's
[`src/components/ui/data-table.tsx`](src/components/ui/data-table.tsx) through
the owned Keycloak compatibility layer at
[`src/shared/keycloak-ui-shared/controls/table/KeycloakDataTable.tsx`](src/shared/keycloak-ui-shared/controls/table/KeycloakDataTable.tsx).
That single boundary covers the existing server loaders, page selection, radio
selection, expandable event details and row-action definitions used by 48
screens. Search now commits 300 ms after typing, and its clear action restores
focus to the input. The shared composition also restores the responsive content
inset previously supplied by PatternFly's toolbar, keeping search, table and
pagination aligned with the page heading and separated from tab dividers. The
pager only renders a row-selection summary when the table exposes selection
controls, and reports it as `selected of visible rows` for the current page.
Rows with a primary destination use the full row as their pointer target. The
name is no longer a separate pointer target, keyboard stop or visually styled
link. Instead, the row has one labelled keyboard stop with the standard rounded
purple focus ring, and Enter follows the underlying semantic link. Checkboxes
and inline controls retain independent behaviour. Search precedes the filter
field selector, so changing that selector cannot shift the search input.

Per-row kebab menus follow upstream: the menu renders whenever a screen supplies
`actions` or `actionResolver`, which 32 Admin Console screens do. `showRowActions`
exists only as an opt-*out* for a screen that replaces the menu with something
else. Because the menu renders through a portal, and React bubbles portal events
up the *React* tree rather than the DOM tree, `RowActions` stops propagation on
each item — otherwise the click reaches the row and follows its primary link
instead of running the action.

`UserDataTable`, `UserDataTableToolbarItems` and `ClientScopesSection` were
previously claimed from Keycloakify to give two screens a server-side page count
and a custom toolbar order. They have been handed back: three forks maintained
across every Keycloak upgrade was too high a price for two of 48 screens, and
`src/components/patternfly/README.md` argues for the shim over ownership for
exactly this reason. Those screens now use the upstream composition.

The compatibility loader still accepts `{ rows, total }` for a Keycloak endpoint
that can supply a count, but no caller uses it today — next-page availability
comes from Keycloak's existing `page size + 1` request, the total is inferred on
the terminal page, and the last-page control stays disabled until it is known.

Ten specialized views own their row markup but share
[`PaginatingTableToolbar.tsx`](src/shared/keycloak-ui-shared/controls/table/PaginatingTableToolbar.tsx).
That toolbar now uses the same Nebari search, page-size and pager controls.
Small form-layout, tree, drag-and-drop and nested detail tables that need
PatternFly-specific row semantics remain PatternFly table bodies and use the
token bridge in `src/admin/index.css`.

### Themes

The build ships two login themes, **each in its own JAR**, selected per realm by
Keycloak's **Login theme** setting:

| Theme | Components | Branding | For |
| --- | --- | --- | --- |
| `template` | stock shadcn/ui (Radix) | none | the default — a starting point to customize |
| `nebari` | Nebari registry (Base UI) | Nebari logo and palette | Nebari's own deployments |

#### The registry

A theme is registered in exactly two places, and they are checked against each
other rather than left to agree by convention:

- **[`themes.json`](themes.json)** — the names, in packaging order. Read by
  [`vite.config.ts`](vite.config.ts) and
  [`scripts/build-keycloak-themes.mjs`](scripts/build-keycloak-themes.mjs),
  which run in Node and cannot import the app's React-typed modules.
- **`THEME_CATALOG` in
  [`src/themes/themeCatalog.ts`](src/themes/themeCatalog.ts)** — the metadata,
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
   [`src/login/uiSets.ts`](src/login/uiSets.ts). A theme that reuses an existing
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
[`src/login/uiSets.ts`](src/login/uiSets.ts) picks the whole set once from the
theme name and `KcPage` renders it. Every member is `lazy`, so a realm only
downloads the theme it uses.

#### The `template` theme

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

- Shell and pages: [`src/login/template/`](src/login/template/) — start with
  `Template.tsx`, which owns the background, the card and the logo slot.
- Components: [`src/components/shadcn/`](src/components/shadcn/), kept separate
  from the Nebari registry in `src/components/ui/` so
  `npx shadcn@latest add <component>` yields matching components.
- Defaults: `TEMPLATE_BRANDING_CONFIG` in
  [`src/branding/brandingConfig.ts`](src/branding/brandingConfig.ts), mirrored
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

### Login pages

Three contracts that Keycloak drives from server state are shared by both
themes' pages, rather than reimplemented per theme — a second copy is how they
drifted apart before:

| Module | What it owns |
| --- | --- |
| [`src/login/userProfileClasses.ts`](src/login/userProfileClasses.ts) (and its `template/` counterpart) | The `kcClsx` map `UserProfileFormFields` needs, including the keys for the password reveal toggle. |
| [`src/login/recaptcha.ts`](src/login/recaptcha.ts) | The global callback the action-based ("invisible") reCAPTCHA submits through. |
| [`src/login/infoMessage.ts`](src/login/infoMessage.ts) | `info.ftl`'s continue-target precedence and its sanitized message HTML. |

Two of these are worth knowing about when writing a page:

**Registration fields are realm configuration.** `Register` renders
`UserProfileFormFields`, not a hand-written field list. Which attributes a
registration form has comes from the realm's User Profile, so a fixed list drops
any required custom attribute the realm declares — and registration then cannot
be completed at all, because the server keeps rejecting a field the page never
showed. `termsAcceptanceRequired` and the reCAPTCHA variants are realm
configuration in the same way.

**Server-supplied messages are message keys or HTML, not text.** Render one
directly and an advanced key shows as the key itself, and markup shows its tags.
Resolve with `advancedMsgStr` and insert through `kcSanitize`, which is
Keycloak's own allow-list — it keeps `b`, `strong`, `p` and friends and strips
anything else. The screenshot baselines for `info` therefore show no heading:
keycloakify's mock uses the literal `<Message header>` as a placeholder, which
sanitizes away because it is shaped like an unknown tag.



The `nebari` theme's login pages are built from the design-system components — `Field` /
`FieldLabel` / `FieldError`, `Input`, `Button`, `Checkbox`, `Alert` — so the
login screens, the consoles and the rest of Nebari share one visual language.
The password-with-reveal control is
[`src/components/nebari/PasswordField.tsx`](src/components/nebari/PasswordField.tsx),
shared by sign-in, register and update-password rather than reimplemented per
page as it once was.

Vertical rhythm comes from one rule — `.nebari-login-wrapper form` sets the
column gap — instead of per-group margins, which is what let the pages drift
apart previously.

Two things still go through CSS classes rather than components:

- **`login-update-profile`** (and `register` when the realm has User Profile
  enabled) renders its fields through keycloakify's `UserProfileFormFields`,
  which takes a map of logical class names, not React components. `kcClassesMap`
  in the page maps those onto the `.nebari-*` classes, so those classes must keep
  matching the components.
- The remaining `.nebari-*` classes in `src/theme.css` cover page chrome — the
  card, header, social buttons, info section.

### Admin and Account consoles

Both consoles are ~520 vendored views from `@keycloakify/keycloak-admin-ui`, and
every one of them imports PatternFly through a single re-export shim at
[`src/shared/@patternfly/react-core/index.tsx`](src/shared/@patternfly/react-core/index.tsx).
Nothing imports `@patternfly/react-core` directly.

That shim is the seam. It re-exports PatternFly wholesale, then shadows the
components that now render Nebari equivalents — `Button`, `TextInput`,
`TextArea`, `Switch`, `Checkbox`, `Label` — so one export swap restyles every
call site without editing (and thereby freezing against upstream) hundreds of
files. The adapters live in
[`src/components/patternfly/`](src/components/patternfly/README.md), which also
records what deliberately stays on PatternFly and why: specialized table
bodies, `Radio`, `Select`/`MenuToggle`, `Modal`, toast `Alert`, and
`variant="control"` buttons. Standard pageable and filterable lists use the
Nebari Data Table compatibility layer described above.

Whatever stays on PatternFly is restyled to the same tokens by
[`src/admin/index.css`](src/admin/index.css). The Admin Console's visible sidebar
is the Nebari component described above, rather than a CSS skin over PatternFly
navigation. The bridge is intentionally small: shared token rules cover legacy
controls that Keycloak still owns. For example, select focus now retains its
one-pixel resting border and draws a non-layout-changing purple ring, preventing
compact table rows from shifting without adding a screen-specific override.

Refs matter in the adapters: 29 views spread `{...register(…)}` from
react-hook-form onto these controls, and that spread carries a callback ref. The
Nebari components are plain function components, and React 18 strips `ref` before
it reaches the DOM node — so each adapter forwards one explicitly. Drop that and
form fields render blank and save blank.

### CSS cascade layers

The single most load-bearing piece of styling setup, declared at the top of
`src/theme.css`:

```css
@layer theme, base, patternfly, components, utilities;
```

PatternFly ships its stylesheets unlayered, and unlayered CSS outranks every
cascade layer — so PatternFly's global reset (`* { padding: 0 }`) beat every
Tailwind utility and stripped design-system components of their padding, font
size and layout. The `patternflyCssLayer` plugin in `vite.config.ts` wraps each
PatternFly stylesheet in the `patternfly` layer.

That layer's **position is the whole point**, and it is the only one that works:

- above `base`, so Tailwind's preflight does not strip PatternFly's own padding
  and borders;
- below `utilities`, so a Tailwind utility on a design-system component still
  beats PatternFly's reset.

Two consequences worth knowing before adding CSS:

- **Unlayered rules beat everything, including design-system components.** Bare
  element selectors (`a`, `input[type="text"]`, `button[type="submit"]`) written
  for the login pages leaked into the consoles and overrode component styling —
  white button labels turned dark, stray borders appeared inside fields. Those
  rules are now scoped with `:where(.nebari-login-wrapper)`, which confines them
  without adding specificity, so the login pages render identically. Prefer the
  namespaced `.nebari-*` classes over widening them again.
- **`display: block` on `svg`** comes from Tailwind's preflight and breaks
  PatternFly's inline icon layout, which is why icons wrapped onto their own line
  and inflated control heights. `src/admin/index.css` restores inline icons
  inside PatternFly — declared inside `@layer components`, which is load-bearing:
  that file is otherwise unlayered, and an unlayered rule outranks *every* named
  layer however weak its selector, so it also beat Tailwind's `hidden` utility and
  pinned a permanent error icon onto every valid field. Adding a rule to that file
  means deciding whether it should sit above or below the utilities.

### Header

Both consoles share one account control,
[`src/components/nebari/ProfileMenu.tsx`](src/components/nebari/ProfileMenu.tsx) —
avatar, name and chevron in a single trigger opening one menu, with the
Light/Dark/System picker inside it as a `menuitemradio` group. The header is
styled only through app-defined `--header-*` tokens in `src/theme.css`; the
registry does not ship them.

Theme state comes from `useNebariTheme` (`src/hooks/use-nebari-theme.ts`). The
`.dark` class has exactly one owner — `useThemePreference`, the registry hook —
and `useNebariTheme` only mirrors the resolved state onto PatternFly's
`.pf-v5-theme-dark` plus `[data-theme]` and `color-scheme`. It used to toggle
`.dark` as well, which worked only because of hook declaration order. It must be
mounted **once per document**, so a console calls it in its header and passes
`themeMode` down.

A realm with Dark Mode switched off (Realm settings → Themes) does not mount the
hook at all: the header renders a static light theme, leaving `colorScheme.ts` —
which runs before React and is paired with a `public/keycloak-theme/*/early-color-scheme.js`
that reads the same storage key before first paint — the single owner of the
forced-light state.

### Branding the consoles

The Admin and Account consoles are PatternFly, re-skinned onto the design
system's tokens by the bridge in
[`src/admin/index.css`](src/admin/index.css). Every theme shares that skin —
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
[`src/branding/consoleLogo.ts`](src/branding/consoleLogo.ts), shared by both
consoles so they cannot disagree.

`useLoginLogoInConsole` defaults to **true**, which is what a realm that
published before the field existed normalizes to — so adding it changed nothing
for existing realms. Turn it off and `consoleLogo` is used instead, which is
worth doing when a login-card mark looks cramped in a 32px-tall masthead.

Step 5 is why the unbranded `template` theme does not show someone else's logo
in its console.

**The Account console stops at step 4.** It runs the same resolver, so a
published logo and a theme's own artwork both reach it — but a theme with
neither falls back to the bundled Nebari mark rather than to the realm name.
`realm-export.json` sets `accountTheme` to `nebari`, so this *is* reached.
Adding the last fallback there is a small change: the account header renders its
own `<img>` and no longer goes through the shared `KeycloakMasthead`, so it
needs no change to vendored shared code.

### Turning the Theme customization page off

Not every deployment wants the editor. Two layers decide, in
[`src/admin/themeCustomization.ts`](src/admin/themeCustomization.ts):

| | Where | Effect |
| --- | --- | --- |
| Per theme | `themeCustomization` in `THEME_CATALOG` | Baked into that theme's `theme.properties` at build time. Because each theme is packaged into its own JAR, a theme with no use for the editor ships without it. |
| Per deployment | `NEBARI_THEME_CUSTOMIZATION=enabled\|disabled` | An environment variable on the Keycloak container, resolved by Keycloak when it renders the page. Overrides the theme. No rebuild, no realm change. |

Dropping the route in [`src/admin/routes.tsx`](src/admin/routes.tsx) is the
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

### Runtime login branding

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

#### Where a published theme lives, and how to make it survive

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

#### It is stored once per locale, and the copies can disagree

A localization message belongs to a locale, so the config is written under every
locale the realm supports plus `en`. That is
[`src/branding/localeVariants.ts`](src/branding/localeVariants.ts), and three
hazards follow from it — all covered by
[`tests/localeVariants.spec.ts`](tests/localeVariants.spec.ts):

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
[`custom_themes/`](custom_themes/README.md) at the project root and commit it: it
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

### Known gaps

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

### Colors

Edit the CSS variables in `src/theme.css`:

```css
:root {
  --nebari-primary: #4f4173;
  --nebari-accent: #32C574;
  /* ... more colors */
}
```

### Logo

Replace the logo files in `public/logo/`:
- `nebari-logo-black-bg.png` - Logo for light theme
- `nebari-logo-purple-bg.png` - Logo for dark theme

Update the logo path in `src/login/Template.tsx`:

```tsx
<img 
  src="/logo/your-logo.png" 
  alt="Your Brand" 
/>
```

### Custom Pages

To customize specific pages, create components in `src/login/pages/`:

```tsx
// src/login/pages/Login.tsx
export default function Login(props: PageProps<...>) {
  // Your custom login page
}
```

Then import and use in `src/login/KcPage.tsx`.

### Translations

Add custom translations in `src/login/i18n.ts`:

```typescript
export const { useI18n } = createUseI18n({
  en: {
    loginTitle: "Your Custom Title",
    // ... more translations
  },
  pt: {
    loginTitle: "Seu Título Personalizado",
    // ... traduções
  }
});
```

## Project Structure

```
nebari-keycloak-theme/
├── public/
│   └── logo/                 # Logo assets
├── src/
│   ├── login/
│   │   ├── pages/           # Custom page components
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Info.tsx
│   │   │   └── Error.tsx
│   │   ├── KcPage.tsx       # Page router
│   │   ├── Template.tsx     # Main template wrapper
│   │   ├── KcContext.ts     # Context types
│   │   └── i18n.ts          # Internationalization
│   ├── admin/               # Vendored Admin Console + token bridge (index.css)
│   ├── account/             # Vendored Account Console
│   ├── shared/              # Vendored shared code + the PatternFly shim
│   ├── components/
│   │   ├── ui/              # Nebari registry components (upstream-managed)
│   │   ├── nebari/          # App-owned compositions (ProfileMenu)
│   │   └── patternfly/      # PatternFly API → Nebari component adapters
│   ├── hooks/               # Registry hooks + useNebariTheme
│   ├── themes/              # Theme catalog and preset import/export
│   ├── theme.css            # Tokens, cascade layers, login styles
│   └── main.tsx             # Entry point
├── custom_themes/           # Committed branding presets (see its README)
├── scripts/
│   └── build-keycloak-themes.mjs  # Packages one JAR per theme
├── dist_keycloak/           # Built JARs, one pair per theme (after build)
├── themes.json              # The theme name registry
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Troubleshooting

### Theme not appearing in Keycloak

1. Verify the JAR file is in the correct location
2. Check Keycloak logs for errors:
   ```bash
   kubectl logs <keycloak-pod>
   ```
3. Ensure Keycloak has been restarted after adding the theme

### Styles not applying

1. Clear browser cache
2. Check browser console for CSS loading errors
3. Verify theme is selected in Realm Settings

### Development server issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

## Resources

- [Keycloakify Documentation](https://docs.keycloakify.dev/)
- [Keycloak Themes Documentation](https://www.keycloak.org/docs/latest/server_development/#_themes)
- [Nebari Documentation](https://www.nebari.dev/docs/)

## License

This theme is part of the Nebari project.
