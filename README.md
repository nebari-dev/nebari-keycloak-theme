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

Then open http://localhost:8080/admin/master/console/ (admin / admin, from
`docker-compose.yml`). `start-dev` disables Keycloak's theme cache, so a fresh
image is all that is needed. `--build` is the part that is easy to forget: without
it the container starts from the previously baked JAR and nothing appears to
change.

The theme has to be selected per realm, under **Realm settings → Themes**
(*Login theme*, *Admin console theme*, *Account theme*). `realm-export.json` sets
only the login theme, so a realm imported with `--import-realm` will not pick up
the console themes until they are set there too.

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
records what deliberately stays on PatternFly and why: `Table` (KeycloakDataTable
drives sorting, selection, expandable rows and the actions kebab through
PatternFly props), `Radio`, `Select`/`MenuToggle`, `Modal`, toast `Alert`, and
`variant="control"` buttons.

Whatever stays on PatternFly is restyled to the same tokens by
[`src/admin/index.css`](src/admin/index.css) and `src/admin/page-nav.css`.

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
  inside PatternFly.

### Header

Both consoles share one account control,
[`src/components/nebari/ProfileMenu.tsx`](src/components/nebari/ProfileMenu.tsx) —
avatar, name and chevron in a single trigger opening one menu, with the
Light/Dark/System picker inside it as a `menuitemradio` group. The header is
styled only through app-defined `--header-*` tokens in `src/theme.css`; the
registry does not ship them.

Theme state comes from `useNebariTheme` (`src/hooks/use-nebari-theme.ts`), which
mirrors one preference onto both theming systems — Nebari's `.dark` /
`[data-theme]` and PatternFly's `.pf-v5-theme-dark`. It must be mounted **once
per document**, so a console calls it in its header and passes `themeMode` down.

### Runtime login branding

When the Nebari Admin Console theme is active, administrators can open
**Theme customization** to edit the login palette, company name, logo,
background image, card radius, default color scheme, and available login
methods. Changes are previewed before they are published.

Published settings are stored in the realm's localization messages under the
`nebariBrandingConfig` key and are applied to subsequent login page loads
without rebuilding the theme.

Unlike the vendored console views, this page is locally owned, so it is built
from the design-system components directly — `Card`, `Field`, `Input`, `Select`,
`Slider`, `Button`, `Alert`, `DropdownMenu`, `Dialog`. Only `PageSection` is
still PatternFly, because it supplies the page chrome every other console page
sits in. `branding.css` therefore only lays things out and styles the two things
that have no component: the native colour swatch and the preview panel.

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

Branding reaches the page as **CSS custom properties**, set inline on the login
wrapper by `getBrandingCssVariables` — `--card`, `--primary`, `--input`,
`--ring` and friends, which the design-system components already read.

**The whole layer is gated on `[data-branded]`**, which `Template` sets only when
`isBrandingCustomized` finds a published config that differs from the theme's
defaults. An unbranded realm therefore gets neither the inline variables nor the
`[data-branded]` rules in `src/theme.css`, and renders byte-identically to a
build without this feature — which is what the screenshot suite verifies. Keep
that gate: without it, adding branding restyles every login page for every realm,
whether or not anyone asked for branding.

Add branded styling under `.nebari-login-wrapper[data-branded]`, never to the
unscoped selectors. The login stylesheet's own element selectors
(`input[type="text"]`, `button[type="submit"]`) are unlayered, so they outrank a
component's own state rules — the `[data-branded]` block re-states the few
declarations branding needs to win, such as taking the focus border from `--ring`
instead of `--accent`.

Three constraints on the palette are easy to break:

- **The defaults must equal the design system's tokens.** They are the baseline
  the `[data-branded]` gate compares against, and the starting point when an
  admin edits a single colour — so an approximation would shift every untouched
  colour the moment a realm brands anything. `DEFAULT_BRANDING_CONFIG` holds the
  tokens rasterised to sRGB hex.
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
- Uploaded branding images are compressed and stored inline in the realm's
  localization messages, which is why the editor labels image storage
  experimental. Move them to object storage before relying on it in production.
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
