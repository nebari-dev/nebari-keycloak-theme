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
# Build the Keycloak theme
npm run build-keycloak-theme
```

This produces two JARs in `dist_keycloak/`:

| File | Target |
| --- | --- |
| `keycloak-theme-for-kc-all-other-versions.jar` | Keycloak 26 and newer |
| `keycloak-theme-for-kc-22-to-25.jar` | Keycloak 22 to 25 |

## Releasing

Pushing to `main` runs
[publish-keycloak-image.yml](.github/workflows/publish-keycloak-image.yml), which
builds both JARs and republishes the container image to
`ghcr.io/<owner>/<repo>` tagged `latest`, `sha-<commit>` and the `version` from
`package.json`.

It also cuts a GitHub release for `v<version>`. The only assets are the two
JARs — that is all a consumer needs to install the theme. The screenshots are
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

2. Locate the generated JAR file:
   ```bash
   ls dist_keycloak/keycloak-theme-*.jar
   ```

3. Copy the JAR to your Keycloak deployment:
   ```bash
   # For standalone Keycloak
   cp dist_keycloak/keycloak-theme-*.jar /path/to/keycloak/providers/

   # For containerized Keycloak (Docker/Kubernetes)
   kubectl cp dist_keycloak/keycloak-theme-*.jar <keycloak-pod>:/opt/keycloak/providers/
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
   unzip dist_keycloak/keycloak-theme-*.jar -d theme-extracted/
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

# Copy the theme JAR
COPY dist_keycloak/keycloak-theme-*.jar /opt/keycloak/providers/

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
│   ├── theme.css            # Tokens, cascade layers, login styles
│   └── main.tsx             # Entry point
├── dist_keycloak/           # Built theme (after build)
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
