# Releasing

## What a push to `main` does

Every push to `main` runs [`publish-keycloak-image.yml`](../.github/workflows/publish-keycloak-image.yml). It
can also be run by hand from the Actions tab.

1. Builds the theme with `npm run build-keycloak-theme`. That runs the [upgrade guards](development.md#upgrade-guards)
   and the type check first, so a failure stops the publish.
2. Builds and pushes the Keycloak image to `ghcr.io/nebari-dev/nebari-keycloak-theme`.
3. **If no release exists yet for the current version,** cuts a GitHub release `v<version>` with both JARs
   attached and screenshots of the login pages in the notes. If one exists, it skips this step and logs a
   notice.

Runs are never cancelled midway, so a half-pushed image or release can't happen; a second push waits for the
first.

## Cutting a release

**Bump `version` in `package.json`.** That is the whole trigger. The next push to `main` creates `v<version>`.

Without a bump, pushes still publish a fresh image but no new release. Keep `themeVersion` in
[`vite.config.ts`](../vite.config.ts) in step with `package.json` &mdash; it is written into the theme's metadata
inside the JAR.

## Versions and tags

| What | Moves after it is published? |
| --- | --- |
| GitHub release `v1.0.0` and its JARs | No |
| Image tag `sha-<commit>` | No |
| Image tag `1.0.0` | **Yes** &mdash; republished by every push until the version is bumped |
| Image tag `latest` | Yes |

So the release `v1.0.0` and the image `:1.0.0` can point at different commits. Anyone who needs a reproducible
image should pin `sha-<commit>`. Making the version tag immutable &mdash; publishing it only alongside a new
release &mdash; would close this gap.

## Dependencies

Dependabot runs monthly for npm and GitHub Actions, configured in
[`.github/dependabot.yml`](../.github/dependabot.yml). The policy:

- **Minor and patch updates** arrive grouped in one pull request. `@typescript-eslint/*` gets its own group,
  because the parser and plugin peer-depend on each other and a lone bump of either fails `npm ci`.
- **Major updates are never proposed.** Nearly every dependency sits under a peer pin from the Keycloakify,
  PatternFly and Vite stack, so a major bump fails `npm ci` with `ERESOLVE`. Take them by hand.
- **Some packages are held further:**

| Package | Why |
| --- | --- |
| `@keycloakify/*`, `@keycloak/keycloak-admin-client` | They track the Keycloak server version, not semver. Bumping them is a Keycloak upgrade &mdash; see [Ownership](ownership.md#upgrading-keycloak) |
| `react`, `react-dom` and their types | The Keycloakify and PatternFly console packages require React 18 |
| `react-hook-form` | `@keycloakify/keycloak-ui-shared` pins it to exactly `7.70.0`, so even a minor bump fails `npm ci` |
| `oidc-spa` (minors) | `@keycloakify/keycloak-ui-shared` pins it to `~10.0.x` |
| `eslint-plugin-react-refresh` (minors) | Still `0.x`, and `0.5` needs ESLint 9; this repo is on ESLint 8 |

Open Dependabot security alerts are tracked in
[the repository's security tab](https://github.com/nebari-dev/nebari-keycloak-theme/security/dependabot).
