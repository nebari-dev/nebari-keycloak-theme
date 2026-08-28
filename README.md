# Nebari Keycloak Theme

A custom Keycloak theme for Nebari using [Keycloakify](https://www.keycloakify.dev/).

## Features

Three Keycloak themes, all published under the single theme name `nebari`:

| Theme | Source | Built on |
| --- | --- | --- |
| Login | [src/login/](src/login/) | Keycloakify + Tailwind |
| Account | [src/account/](src/account/) | `@keycloakify/keycloak-account-ui` (Single-Page) + PatternFly 5 |
| Admin | [src/admin/](src/admin/) | `@keycloakify/keycloak-admin-ui` + PatternFly 5 |

The login theme customises eight pages: Login, Register, Info, Error,
LoginResetPassword, LoginUpdatePassword, LoginUpdateProfile and
LoginVerifyEmail, plus the shared Template they render into. See
[src/login/pages/](src/login/pages/).

Light and dark are both supported across all three. The preference is stored
under a single `nebari-admin-theme` key so it carries between the login page and
the account and admin consoles.

There is no email theme in this repository.

## Prerequisites

- Node.js 20.19+ and npm. Vite 7 requires it, and CI runs Node 20.
- Java 17 and Maven, if you build the theme JARs locally (`keycloakify build`
  packages them through Maven).
- Keycloak 22 or newer to install into. The build emits a separate JAR for
  22 to 25 and for 26+, and the theme is developed against 26.

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

### Running against a real Keycloak

The Vite dev server renders the pages standalone. To exercise them inside an
actual Keycloak, [docker-compose.yml](docker-compose.yml) brings up Keycloak
plus PostgreSQL with the theme baked in and the `nebari` realm preloaded from
[realm-export.json](realm-export.json).

The compose file builds the image from the in-repo [Dockerfile](Dockerfile),
which copies a JAR out of `dist_keycloak/`, so build the theme first:

```bash
npm run build-keycloak-theme
docker compose up --build
```

Keycloak comes up on http://localhost:8080 with the master-realm admin
`admin` / `admin`. The imported `nebari` realm already sets `loginTheme` to
`nebari`.

Note that `realm-export.json` leaves `accountTheme` at `keycloak.v3`, so the
account console falls back to stock Keycloak until you switch it under
**Realm Settings** then **Themes**.

Tear down with `docker compose down -v`. The `-v` drops the Postgres volume so
the realm re-imports cleanly on the next start.

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

Keycloak loads a theme from a provider JAR, and `kc.sh build` has to run after
the JAR is on disk. In practice that means baking it into an image or mounting
it from durable storage. A ConfigMap is not an option: the JARs are around 10 MB
each and a ConfigMap is capped at 1 MiB.

### Option 1: Build a Keycloak image (recommended)

[Dockerfile](Dockerfile) in this repository is a two-stage build that copies the
JAR into `/opt/keycloak/providers/` and runs `kc.sh build`. It takes two args:

| Arg | Default | Purpose |
| --- | --- | --- |
| `KEYCLOAK_VERSION` | `26.0` | Base `quay.io/keycloak/keycloak` tag |
| `THEME_JAR` | `keycloak-theme-for-kc-all-other-versions.jar` | Which JAR to bake in; switch to `keycloak-theme-for-kc-22-to-25.jar` for older Keycloak |

```bash
npm run build-keycloak-theme
docker build -t your-registry/keycloak-nebari:latest .
docker push your-registry/keycloak-nebari:latest
```

CI already does this on every push to `main`. See [Releasing](#releasing) for the
published image and its tags.

### Option 2: Drop the JAR into an existing Keycloak

Build the theme, copy
`dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar` into the server's
`/opt/keycloak/providers/` directory, then run `/opt/keycloak/bin/kc.sh build`
and restart the server. On Kubernetes the equivalent is copying the JAR into the
pod and restarting the deployment.

This does not survive a pod restart unless `/opt/keycloak/providers/` is backed
by a persistent volume. Use it for a quick try, not for anything long-lived.

[k8s-deployment-example.yaml](k8s-deployment-example.yaml) is in the repository
but delivers the JAR through a ConfigMap, so it cannot work as written. It is
tracked separately and should not be followed yet.

## Configuring Keycloak to Use the Theme

Once the provider is loaded and Keycloak has restarted:

1. Sign in to the admin console
2. Pick your realm (for example `nebari`)
3. Open **Realm Settings**, then the **Themes** tab
4. Set **Login theme** to `nebari`. Set **Account theme** to `nebari` for the
   branded account console, and **Admin console theme** to `nebari` for the
   admin UI. Both are optional and independent of the login theme.
5. **Save**

Leave **Email theme** alone. This repository does not build one, so `nebari` is
not a valid choice there.

## Customization

### Colors

The login theme and the PatternFly consoles use two different token layers.

[src/theme.css](src/theme.css) drives the login theme. It imports Tailwind and
defines the Nebari palette plus light and dark surface tokens:

```css
:root {
    --nebari-purple: #7c3aed;
    --nebari-blue: #0b70e0;
    --bg-primary: #f4f4f6;
    --text-primary: #111118;
    /* ... */
}
```

[src/nebari-brand.css](src/nebari-brand.css) maps that palette onto PatternFly 5
variables and is imported by both consoles. PatternFly sets its dark tokens
inside `.pf-v5-theme-dark`, which outranks `:root`, so every override appears in
both blocks:

```css
:root {
    --pf-v5-global--primary-color--100: #7c3aed;
}
```

Per-console tweaks that are not brand tokens live in
[src/account/nebari-account.css](src/account/nebari-account.css) and
[src/admin/index.css](src/admin/index.css).

### Logo

The login template loads its logo through a `publicAssetUrl` helper rather than a
plain path, so the URL resolves correctly under Keycloak's resource prefix. The
helper is defined in [src/login/Template.tsx](src/login/Template.tsx) and just
prefixes `import.meta.env.BASE_URL`:

```tsx
<img src={publicAssetUrl("logo/nebari-logo-light.svg")} alt="Nebari" />
```

The files it points at are `public/logo/nebari-logo-light.svg` and
`public/logo/nebari-logo-dark.svg`. The consoles use their own copies at
[src/account/assets/logo-light.svg](src/account/assets/logo-light.svg) and
[src/admin/assets/logo-light.svg](src/admin/assets/logo-light.svg), imported
directly by the header components.

`public/logo/` also holds several lockup variants that nothing currently
references.

### Custom Pages

Login page components live in [src/login/pages/](src/login/pages/) and are wired
up in [src/login/KcPage.tsx](src/login/KcPage.tsx). To take over a page
Keycloakify still renders from its defaults, add the component and add its
`pageId` to the switch in `KcPage.tsx`.

The account and admin themes work differently. They ship as upstream apps, and
you claim individual files before editing them:

```bash
npx keycloakify own --path "admin/PageHeader.tsx"
npx keycloakify own --path "admin/PageHeader.tsx" --revert
```

Claimed files are listed at the top of [src/.gitignore](src/.gitignore) under
`=== Owned files ===`. Everything else under `src/admin/`, `src/account/` and
`src/shared/` is regenerated by `keycloakify sync-extensions` on `npm install`
and must not be edited by hand.

### Components

[src/components/ui/](src/components/ui/) holds the shadcn components used by the
login pages, with helpers in [src/lib/utils.ts](src/lib/utils.ts).
[components.json](components.json) configures the generator and registers the
`@nebari` registry pointing at
https://nebari-dev.github.io/nebari-design/r/{name}.json

### Translations

Add custom translations in [src/login/i18n.ts](src/login/i18n.ts):

```typescript
export const { useI18n } = createUseI18n({
  en: {
    loginTitle: "Your Custom Title"
  }
});
```

## Project Structure

```
nebari-keycloak-theme/
  .github/workflows/
    playwright.yml              Visual regression on every PR
    publish-keycloak-image.yml  Image + release on push to main
  public/
    logo/                       Login theme logo assets
    keycloak-theme/             Early color-scheme scripts for the consoles
  src/
    login/
      pages/                    Nine customised login pages
      KcPage.tsx                Page router
      Template.tsx              Shared layout
      KcContext.ts              Types + preview mocks
      i18n.ts                   Internationalization
    account/                    Account console theme
      KcAccountUi.tsx
      root/                     Owned header override
      nebari-account.css
    admin/                      Admin console theme
      PageHeader.tsx            Owned header override
      index.css
      page-nav.css
    components/ui/              shadcn components
    lib/utils.ts
    nebari-brand.css            PatternFly 5 brand tokens (both consoles)
    theme.css                   Login theme tokens + Tailwind
    kc.gen.tsx                  Generated by Keycloakify, do not edit
    main.tsx                    Entry point
    .gitignore                  Owned vs. generated file manifest
  tests/
    visual.spec.ts
    screenshots/linux/          Committed baselines
  dist_keycloak/                Built JARs (gitignored)
  Dockerfile                    Two-stage Keycloak image build
  docker-compose.yml            Local Keycloak + PostgreSQL
  realm-export.json             Preloaded `nebari` realm for local dev
  k8s-deployment-example.yaml   Broken, see Deployment
  components.json               shadcn config
  playwright.config.ts
  vite.config.ts                Keycloakify plugin, themeName `nebari`
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Type-check then build the SPA |
| `npm run build-keycloak-theme` | Build, then package both theme JARs |
| `npm run preview` | Serve the built SPA |
| `npm run lint` | ESLint, zero warnings tolerated |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:screenshots` | Playwright visual tests against the baselines |
| `npm run test:screenshots:update` | Rewrite the baselines |

## Troubleshooting

### Theme not appearing in Keycloak

1. Confirm the JAR is in `/opt/keycloak/providers/` and that `kc.sh build` ran
   after it landed. Copying the JAR alone is not enough.
2. Check you used the JAR matching your Keycloak version.
3. Check the Keycloak logs for provider load errors.

### Styles not applying

1. Clear the browser cache.
2. Confirm the theme is actually selected in the **Themes** tab of
   **Realm Settings** for the console you are looking at. Login, account and
   admin are set independently.

### Console changes vanish after `npm install`

`postinstall` runs `keycloakify sync-extensions`, which regenerates every
unclaimed file under `src/admin/`, `src/account/` and `src/shared/`. Claim the
file with `npx keycloakify own --path "<path>"` before editing it.

### Development server issues

```bash
rm -rf node_modules package-lock.json
npm install
rm -rf node_modules/.vite
```

## Resources

- [Keycloakify Documentation](https://docs.keycloakify.dev/)
- [Keycloak Themes Documentation](https://www.keycloak.org/docs/latest/server_development/#_themes)
- [Nebari Documentation](https://www.nebari.dev/docs/)

## License

Apache License 2.0. See [LICENSE](LICENSE).
