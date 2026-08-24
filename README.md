# Nebari and OpenTeams Collab Keycloak Themes

Custom Keycloak themes for Nebari and OpenTeams Collab using
[Keycloakify](https://www.keycloakify.dev/). Both variants share the same page
and Nebari design-system components while keeping their branding isolated.

## Features

- ✨ Custom Nebari branding with color scheme
- 🌐 OpenTeams Collab variant with its navy, blue, coral, and amber palette
- 🔤 Self-hosted Geist and Inter Tight variable fonts
- 🎨 Light and dark theme support
- 📱 Fully responsive design
- 🔐 Customized login, registration, and error pages
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

Open http://localhost:5173 to see the OpenTeams Collab theme in your browser.
The standalone development preview defaults to `openteams-collab`; add
`theme=nebari` to preview the original Nebari variant.

Any login page can be previewed standalone with the `preview` query parameter,
which feeds a mock `kcContext` to the app — for example
http://localhost:5173/?preview=register. The available names are listed in
`getKcContextMockForPreview` in [src/login/KcContext.ts](src/login/KcContext.ts).

Preview the Collab variant by adding `theme=openteams-collab`:

```text
http://localhost:5173/?preview=login-providers&theme=openteams-collab
```

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

This produces four JARs in `dist_keycloak/`. Each file contains only the named
theme, so consumers do not need to install both variants:

| Theme | File | Target |
| --- | --- | --- |
| Nebari | `nebari-keycloak-theme-for-kc-all-other-versions.jar` | Keycloak 26 and newer |
| Nebari | `nebari-keycloak-theme-for-kc-22-to-25.jar` | Keycloak 22 to 25 |
| OpenTeams Collab | `openteams-collab-keycloak-theme-for-kc-all-other-versions.jar` | Keycloak 26 and newer |
| OpenTeams Collab | `openteams-collab-keycloak-theme-for-kc-22-to-25.jar` | Keycloak 22 to 25 |

## Releasing

Pushing to `main` runs
[publish-keycloak-image.yml](.github/workflows/publish-keycloak-image.yml), which
builds all four theme-specific JARs and republishes the Nebari container image to
`ghcr.io/<owner>/<repo>` tagged `latest`, `sha-<commit>` and the `version` from
`package.json`.

Every run also uploads two separate workflow artifacts — one for Nebari and one
for OpenTeams Collab — each containing its two Keycloak-compatible JARs. This
makes both themes independently downloadable from every successful push to
`main`, even when the package version has not changed.

It also cuts a GitHub release for `v<version>`. The only assets are the four
theme-specific JARs. The screenshots are
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

2. Locate the generated JARs and choose the theme and Keycloak version you need:
   ```bash
   ls dist_keycloak/*.jar
   ```

3. Copy the JAR to your Keycloak deployment:
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

# Copy the theme JAR
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
   - **Account theme**: `nebari` (optional)
   - **Email theme**: `nebari` (optional)

   For the Collab-styled login, set **Login theme** to `openteams-collab`.

5. Click **Save**

## Customization

### Colors

Edit the CSS variables in `src/theme.css`. The Collab variant is scoped under
`html[data-kc-theme="openteams-collab"]`, so its changes do not affect Nebari.

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
│   ├── theme.css            # Theme styles
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
