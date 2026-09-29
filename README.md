# Nebari Keycloak Theme

A custom Keycloak theme for Nebari using
[Keycloakify](https://www.keycloakify.dev/), built from the Nebari design-system
components. It ships two themes, `nebari` and `collab` (OpenTeams Collab), each
packaged in its own JAR and published as its own image — see
[Branding](#branding).

## Features

- ✨ Custom Nebari branding with color scheme
- 🌐 A separate OpenTeams Collab theme, `collab`
- 🔤 Self-hosted Geist, Inter Tight and IBM Plex Mono fonts
- 🎨 Light and dark theme support
- 📱 Fully responsive design
- 🔐 Customized login, registration, and error pages
- 🧭 Nebari-styled Keycloak Admin Console
- 🌐 Internationalization ready

## Prerequisites

- Node.js 20.19+ (or 22.12+) and npm — required by Vite 7
- Java 17+ and Maven, to build the theme JARs (Keycloakify calls Maven)
- Docker, to run the local Keycloak from `docker-compose.yml`
- A Keycloak instance to deploy to (version 22 or newer)

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

Preview the Collab theme by adding `theme=collab`:

```text
http://localhost:5173/?preview=login-providers&theme=collab
```

### Working on the Admin or Account console

**The dev server cannot show these.** Both consoles authenticate against a real
Keycloak, so there is no mock `kcContext` to preview them with — and the theme is
delivered as a JAR baked into the image at build time, so restarting the
container is not enough either. Rebuild the JAR and the image:

```bash
npm run build-keycloak-theme
docker compose up -d --build keycloak
```

`start-dev` disables Keycloak's theme cache, so a fresh image is all that is
needed. `--build` is the part that is easy to forget: without it the container
starts from the previously baked JAR and nothing appears to change.

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

`npm run check` runs as part of `npm run build` (and so of
`npm run build-keycloak-theme`), and covers the two ways this theme can break *silently* on a Keycloak bump — neither
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
- **`check:patternfly-version`** — more than 600 references in this theme's
  CSS name PatternFly's classes and variables directly (`.pf-v5-c-table`, `--pf-v5-global--*`). When
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

Baselines live in `tests/screenshots/<platform>/<theme>/` because each OS rasterises
fonts slightly differently. CI runs on Linux, so **regenerate baselines on Linux**
— snapshots updated on macOS or Windows are written to a different directory and
will not satisfy the check. If you are not on Linux, run the update inside the
matching Playwright container:

```bash
docker run --rm -v "$PWD":/work -w /work --ipc=host \
  mcr.microsoft.com/playwright:v1.62.1-noble \
  npm run test:screenshots:update
```

Every pull request captures each login preview plus a full-page render for every
theme, with the same assertions for each. Baselines are kept per theme, in
`tests/screenshots/<platform>/nebari/` and `tests/screenshots/<platform>/collab/`,
so a reviewer sees the Collab login pages next to the Nebari ones in the PR. The
theme list lives at the top of [tests/visual.spec.ts](tests/visual.spec.ts).

Every CI run also uploads a `theme-screenshots` artifact containing fresh renders
from that branch, including when baseline comparison fails. These captures go to
`theme-screenshots/`, separately from the committed baselines and the
`playwright-report` diff artifact. Open the PR's **Playwright screenshots** check,
then download **theme-screenshots** from the run's artifacts to review the current
login screens. Intentional design changes still require updated baselines to be
committed; CI does not accept them automatically.

## Building the Theme

```bash
# Build every theme
npm run build-keycloak-theme

# Build only the Collab theme
npm run build-keycloak-theme -- --theme collab

# What can I build?
npm run build-keycloak-theme -- --list
```

Note the `--` before any flags: without it npm keeps them for itself instead of
passing them to the script.

**Every JAR contains exactly one theme.** The build asserts this on every run —
it opens each JAR and fails if it finds more than one `theme/<name>/` directory,
or if `META-INF/keycloak-themes.json` advertises more than one theme — so the
guarantee cannot quietly regress.

A full build produces four JARs in `dist_keycloak/`:

| File | Target |
| --- | --- |
| `nebari-keycloak-theme-for-kc-all-other-versions.jar` | Nebari, Keycloak 26 and newer |
| `nebari-keycloak-theme-for-kc-22-to-25.jar` | Nebari, Keycloak 22 to 25 |
| `collab-keycloak-theme-for-kc-all-other-versions.jar` | Collab, Keycloak 26 and newer |
| `collab-keycloak-theme-for-kc-22-to-25.jar` | Collab, Keycloak 22 to 25 |

If the build fails part way through, the directory is restored to what it was.

## Branding

The two themes, `nebari` and `collab`, share one build and one stylesheet. The
brand is the theme Keycloak is rendering: `src/main.tsx` stamps
`kcContext.themeName` on `<html>` as `data-brand`, and the login page, the Admin
Console masthead and the Admin dashboard's hero mark read it from there.

Collab has its own look, taken from the openteams.com landing page: a deep-blue
ground, Inter Tight, a glass card and pill buttons. Those rules are the
`html[data-brand="collab"]` block in [src/theme.css](src/theme.css), scoped to
the login pages and the Admin Console; the Account console keeps the Nebari
styling. Strings that name the product, such as the register title, are keyed
by theme in [src/login/i18n.ts](src/login/i18n.ts).
`collab` was called `openteams` before; a realm that still selects `openteams`
must be switched to `collab`.

[src/lib/branding.ts](src/lib/branding.ts) is the only place a logo path is
written down. To add a theme, add its name to [themes.json](themes.json), an
entry in `branding.ts`, and a `data-brand` rule in [src/theme.css](src/theme.css)
if the mark needs more than an `<img>`.

## Releasing

Pushing to `main` runs
[publish-keycloak-image.yml](.github/workflows/publish-keycloak-image.yml), which
builds every JAR and republishes one container image per theme, each carrying
only its own theme:

| Theme | Image |
| --- | --- |
| Nebari | `ghcr.io/<owner>/<repo>` |
| Collab | `ghcr.io/<owner>/collab-keycloak-theme` |

Both are tagged `latest`, `sha-<commit>` and the `version` from `package.json`.
After the Collab package's first publish, check its visibility under its
**Package settings** so it matches the Nebari package.

Every run also uploads one workflow artifact per theme containing both
Keycloak-compatible JARs, so each theme is downloadable from every successful
push to `main`, even when the package version has not changed.

It also cuts a GitHub release for `v<version>`. The only assets are the four
JARs. The screenshots are
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

Keycloak loads a theme from a JAR in its `providers/` directory. Every route
below gets one of the JARs into that directory; after that, select the theme in
the realm — see
[Configuring Keycloak to Use the Theme](#configuring-keycloak-to-use-the-theme).

Pick the JAR for your theme and Keycloak version:

| Theme | Keycloak 26 and newer | Keycloak 22 to 25 |
| --- | --- | --- |
| Nebari | `nebari-keycloak-theme-for-kc-all-other-versions.jar` | `nebari-keycloak-theme-for-kc-22-to-25.jar` |
| Collab | `collab-keycloak-theme-for-kc-all-other-versions.jar` | `collab-keycloak-theme-for-kc-22-to-25.jar` |

Build them with `npm run build-keycloak-theme`, or download them from the
[GitHub release](#releasing). The published images carry the Keycloak 26+ JAR
for one theme each:

| Theme | Image |
| --- | --- |
| Nebari | `ghcr.io/nebari-dev/nebari-keycloak-theme:<version>` |
| Collab | `ghcr.io/nebari-dev/collab-keycloak-theme:<version>` |

`<version>` is the `version` in `package.json`, for example `1.1.0`. Pin it
rather than using `latest`, so a pod restart cannot change the theme under you.

A ConfigMap cannot hold the theme: each JAR is about 12 MB, and a ConfigMap is
capped at 1 MiB. For a plain Kubernetes Deployment, use an init container that
copies the JAR out of the published image instead, as
[k8s-deployment-example.yaml](k8s-deployment-example.yaml) does.

### Option 1: Manual Deployment

For Keycloak running directly on a host.

1. Copy the JAR into Keycloak's providers directory:
   ```bash
   cp dist_keycloak/nebari-keycloak-theme-for-kc-all-other-versions.jar /path/to/keycloak/providers/
   ```

2. Rebuild and restart Keycloak:
   ```bash
   /path/to/keycloak/bin/kc.sh build
   /path/to/keycloak/bin/kc.sh start
   ```

### Option 2: Kubernetes with `keycloakconfig.yml`

For the Nebari Keycloak chart (`keycloak-helm-test`), whose whole deployment is
configured in `keycloakconfig.yml`. The theme needs two settings there: an image
that contains the theme JAR, and the theme names for each realm.

```yaml
keycloak:
  # An image with the theme JAR in /opt/keycloak/providers/.
  image:
    repository: nebari-keycloak
    tag: "26.5.2"

  realm:
    # Applies `themes` to realms that already exist, on every upgrade.
    configureExisting: true
    instances:
      - name: nebari
        themes:
          login: nebari     # or collab
          admin: nebari
          account: nebari
```

- **The image** is built from that project's `image/Dockerfile`, with the JAR
  from [Deployment](#deployment) copied into its `themes/` directory. The chart
  starts Keycloak with `start --optimized` against PostgreSQL, so the image has
  to be built for PostgreSQL. The published `ghcr.io/nebari-dev/*` images are
  not; under `--optimized` they ignore `KC_DB=postgres`.
- **`themes`** is what the chart's post-upgrade Job sets on each realm. A
  realm's `import` JSON only applies when the realm does not exist yet, so its
  `loginTheme`, `accountTheme` and `adminTheme` should match but cannot change
  an existing realm.

Apply it with `helm upgrade --install keycloak . -f keycloakconfig.yml`.

### Option 3: Nebari

Nebari deploys Keycloak with the `keycloakx` chart and passes
`security.keycloak.overrides` from `nebari-config.yaml` to it as Helm values.
Two details of Nebari's
[own values](https://github.com/nebari-dev/nebari/blob/main/src/_nebari/stages/kubernetes_keycloak/template/modules/kubernetes/keycloak-helm/values.yaml)
shape the override:

- Nebari already mounts an `emptyDir` called `metrics-plugin` over
  `/opt/keycloak/providers`, which would hide any JAR baked into a custom
  Keycloak image. The theme is therefore copied into that same volume. Do not
  set `overrides.image` to the theme image.
- Helm replaces a string value wholesale, so overriding `extraInitContainers`
  drops Nebari's metrics init container. Copy it back in unchanged, as below.

Do not use `security.keycloak.themes` either; it is disabled on Keycloak 26.

1. Create the `ghcr.io` pull secret in Nebari's namespace (`dev` by default):
   ```bash
   kubectl -n dev create secret docker-registry ghcr-creds \
     --docker-server=ghcr.io \
     --docker-username=<github-user> \
     --docker-password=<token-with-read:packages>
   ```

2. Add the override to `nebari-config.yaml`. Keep Nebari's
   `initialize-spi-metrics-jar` entry at the top of the list, copied unchanged
   from its `values.yaml`, and keep its `extcrcreds` pull secret:
   ```yaml
   security:
     keycloak:
       overrides:
         imagePullSecrets:
           - name: extcrcreds
           - name: ghcr-creds
         extraInitContainers: |
           # - name: initialize-spi-metrics-jar   <- Nebari's entry, unchanged
           - name: install-keycloak-theme
             # For Collab: ghcr.io/nebari-dev/collab-keycloak-theme:1.1.0
             image: ghcr.io/nebari-dev/nebari-keycloak-theme:1.1.0
             command: ["sh", "-c", "cp /opt/keycloak/providers/*.jar /data/"]
             securityContext:
               runAsUser: 0
             volumeMounts:
               - name: metrics-plugin
                 mountPath: /data
   ```

3. Deploy:
   ```bash
   nebari deploy -c nebari-config.yaml
   ```

4. Check that both JARs are in place:
   ```bash
   kubectl -n dev exec keycloak-keycloakx-0 -c keycloak -- ls /opt/keycloak/providers
   # keycloak-metrics-spi-7.0.0.jar
   # nebari-keycloak-theme-for-kc-all-other-versions.jar
   ```

5. Select the theme in the `nebari` realm, and in `master` for the Admin
   Console, as described in
   [Configuring Keycloak to Use the Theme](#configuring-keycloak-to-use-the-theme).
   Nebari's realm Terraform ignores the theme fields, so later
   `nebari deploy` runs leave the choice alone.

### Option 4: Build Custom Keycloak Image

For Docker, or anything else that runs a single Keycloak image. The
[Dockerfile](Dockerfile) in this repository does this, and is what the published
images are built from:

```bash
npm run build-keycloak-theme
docker build \
  --build-arg KEYCLOAK_VERSION=26.0 \
  --build-arg THEME_JAR=nebari-keycloak-theme-for-kc-all-other-versions.jar \
  -t your-registry/keycloak-nebari:latest .
docker push your-registry/keycloak-nebari:latest
```

The image's entrypoint is `kc.sh` with no arguments, so pass the command, for
example `start`, when you run it. Don't use this image under Nebari; see
[Option 3](#option-3-nebari).

## Configuring Keycloak to Use the Theme

Installing the JAR only makes the theme available. Each realm still chooses its
own themes. The Admin Console is themed by the realm you log in to, which for
the admin user is normally `master`.

The JAR provides a **login**, an **account** and an **admin** theme, named
`nebari` or `collab`. It has no email theme, so leave **Email theme** on
`keycloak`.

### From the Admin Console

1. Log in to the Admin Console as an administrator: `https://<keycloak-host>/admin/`,
   or `https://<keycloak-host>/auth/admin/` under Nebari.
2. Pick the realm to theme from the realm selector at the top left, for example
   `nebari`.
3. Go to **Realm settings** → **Themes**.
4. Set **Login theme**, **Account theme** and **Admin console theme** to `nebari`,
   or to `collab` for the Collab theme. If neither appears in the list, the JAR
   was not loaded; see [Troubleshooting](#theme-not-appearing-in-keycloak).
5. Click **Save**.
6. To theme the Admin Console's own login page too, repeat steps 2–5 for the
   `master` realm.
7. Open the realm's account console, `https://<keycloak-host>/realms/<realm>/account`
   (with the `/auth` prefix under Nebari), in a private window to see the
   login page.

### From the command line

`kcadm.sh` ships in the Keycloak image. Open a shell in the Keycloak pod. On
Nebari that is `keycloak-keycloakx-0` in the `dev` namespace, and the admin user
is `root`:

```bash
kubectl -n dev exec -it keycloak-keycloakx-0 -c keycloak -- bash
```

Then, inside the pod:

```bash
cd /opt/keycloak/bin

# Prompts for the admin password. Use --user root on Nebari; drop /auth outside it.
./kcadm.sh config credentials --config /tmp/kcadm.config \
  --server http://localhost:8080/auth --realm master --user <admin-user>

./kcadm.sh update realms/<realm> --config /tmp/kcadm.config \
  -s loginTheme=nebari -s accountTheme=nebari -s adminTheme=nebari

# Optional: theme the Admin Console's own login page too.
./kcadm.sh update realms/master --config /tmp/kcadm.config \
  -s loginTheme=nebari -s adminTheme=nebari

# Check the result.
./kcadm.sh get realms/<realm> --config /tmp/kcadm.config \
  --fields loginTheme,accountTheme,adminTheme
```

### Declaratively

- **Realm import JSON**: set `"loginTheme"`, `"accountTheme"` and `"adminTheme"`
  on the realm, as [realm-export.json](realm-export.json) does.
- **Terraform** ([`keycloak/keycloak` provider](https://registry.terraform.io/providers/keycloak/keycloak/latest/docs/resources/realm)):
  set `login_theme`, `account_theme` and `admin_theme` on `keycloak_realm`.

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

### Login pages

Every login page is built from the design-system components — `Field` /
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

Both consoles are ~540 vendored views from `@keycloakify/keycloak-admin-ui` and
`@keycloakify/keycloak-account-ui`, and every one that uses PatternFly imports it through a single re-export shim at
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

Refs matter in the adapters: 13 views spread `{...register(…)}` from
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

### Known gaps

- `src/account/nebari-account.css` is a separate, older restyling of PatternFly
  using hardcoded hex values rather than tokens. The Account console will not be
  fully consistent until it is converted.
- `.nebari-*` classes and the design-system components are two ways of styling
  the same thing. They are kept in step by hand because `UserProfileFormFields`
  needs the class-based path; prefer the components for anything new.
- The registry's components take `ref` as a plain prop (the React 19
  convention) and this app is on React 18, where a function component cannot
  receive one. `ProfileMenu` works around it for its menu trigger by rendering a
  DOM element via `render`; the same applies to `Tooltip`, which is why the
  PatternFly tooltip is still in use.

### Colors

Edit the CSS variables in `src/theme.css`.

```css
:root {
  --nebari-purple: #7c3aed;
  --nebari-purple-dark: #6d28d9;
  /* ... more colors */
}
```

### Logo

Logos live in `public/logo/`. Each theme's light and dark logo paths are set in
[src/lib/branding.ts](src/lib/branding.ts), relative to `public/`:

```ts
nebari: {
  light: "logo/nebari-logo-light.svg",
  dark: "logo/nebari-logo-dark.svg"
},
```

Replace those files, or point the entries at new ones. Collab uses
`logo/collab-symbol.png` for both, with the "Collab" wordmark set as text in
`src/login/Template.tsx`.

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
const { useI18n, ofTypeI18n } = i18nBuilder
  .withThemeName<ThemeName>()
  .withCustomTranslations({
    en: {
      loginSubtitle: "Welcome back! Please enter your credentials.",
      // Key a message by theme when it names the product:
      registerTitle: {
        nebari: "Create your Nebari account",
        collab: "Create your Collab account"
      }
    }
  })
  .build();
```

Add another language as a sibling of `en`, for example `pt: { ... }`.

## Project Structure

```
nebari-keycloak-theme/
├── public/
│   └── logo/                 # Logo assets
├── src/
│   ├── login/
│   │   ├── pages/           # Custom page components (Login, Register, Info, Error, …)
│   │   ├── KcPage.tsx       # Page router
│   │   ├── Template.tsx     # Main template wrapper
│   │   ├── KcContext.ts     # Context types
│   │   └── i18n.ts          # Internationalization
│   ├── admin/               # Vendored Admin Console + token bridge (index.css)
│   ├── account/             # Vendored Account Console
│   ├── shared/              # Vendored shared code + the PatternFly shim
│   ├── components/
│   │   ├── ui/              # Nebari registry components (upstream-managed)
│   │   ├── nebari/          # App-owned compositions (ProfileMenu, PasswordField)
│   │   └── patternfly/      # PatternFly API → Nebari component adapters
│   ├── hooks/               # Registry hooks + useNebariTheme
│   ├── lib/branding.ts      # Per-theme logo paths
│   ├── theme.css            # Tokens, cascade layers, login styles
│   └── main.tsx             # Entry point
├── scripts/                 # JAR build script and upgrade guards
├── tests/                   # Playwright visual tests and baselines
├── dist_keycloak/           # Built theme (after build)
├── themes.json              # The themes to build
├── Dockerfile
├── docker-compose.yml       # Local Keycloak + PostgreSQL
├── realm-export.json        # Development realm (dev only)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Troubleshooting

### Theme not appearing in Keycloak

1. Verify the JAR is in the providers directory:
   ```bash
   kubectl -n <namespace> exec <keycloak-pod> -c keycloak -- ls /opt/keycloak/providers
   ```
2. If it is missing and the JAR is copied in by an init container (Nebari),
   check that container:
   ```bash
   kubectl -n <namespace> describe pod <keycloak-pod>   # ErrImagePull means the ghcr.io pull secret is missing or wrong
   kubectl -n <namespace> logs <keycloak-pod> -c install-keycloak-theme
   ```
3. Check that the JAR matches the Keycloak version: the `22-to-25` JAR on
   Keycloak 22–25, the `all-other-versions` JAR on 26 and newer.
4. If the JAR is added at startup rather than built into the image, make sure
   Keycloak starts with `start`, not `start --optimized`, so it rebuilds with
   the new provider. Either way, restart it after changing the JAR.
5. Check Keycloak logs for errors:
   ```bash
   kubectl -n <namespace> logs <keycloak-pod> -c keycloak
   ```

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

This theme is part of the Nebari project and is licensed under the
[Apache License 2.0](LICENSE).
