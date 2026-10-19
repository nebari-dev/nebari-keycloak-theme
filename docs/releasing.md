# Releasing

## What a push to `main` does

Every push to `main` runs [`publish-keycloak-image.yml`](../.github/workflows/publish-keycloak-image.yml). It
can also be run by hand from the Actions tab.

1. Builds the themes once with `npm run build-keycloak-theme`. That runs the
   [upgrade guards](development.md#upgrade-guards) and the type check first, so a failure stops the publish.
   The JARs are uploaded as a workflow artifact, so they can be downloaded from every run.
2. Builds the image from those JARs on native `amd64` and `arm64` runners and pushes each by digest to
   `quay.io/nebari/nebari-keycloak-theme`.
3. Joins the two into one multi-arch manifest tagged `latest` and `sha-<commit>`, plus `<version>` when step 4
   is about to cut a release.
4. **If no release exists yet for the current version,** cuts a GitHub release `v<version>` with every JAR
   attached. The notes list the JARs per theme in `themes.json` and link to [the screenshots](screenshots.md) at
   that commit rather than embedding them. If one exists, it skips this step and logs a notice.

Runs on `main` are never cancelled midway, so a half-pushed image or release can't happen; a second push waits
for the first. A manual run from the Actions tab publishes only from `main`; on any other branch it builds and
stops.

Pull requests run the same workflow up to the image build, for both architectures, without logging in or
pushing. Fork pull requests get no secrets, and none are needed.

### Quay setup

The workflow logs in with the organization secrets `QUAY_USERNAME` and `QUAY_TOKEN`, a Quay robot account.
Quay creates a repository as **private** on its first push, and a robot can only push where it has write
access. So before the first publish, a Quay admin of the `nebari` organization has to, once:

1. Create `quay.io/nebari/nebari-keycloak-theme` as a **public** repository.
2. Grant the robot behind `QUAY_USERNAME` **write** on it.

## Cutting a release

**Bump `version` in `package.json`.** That is the whole trigger. The next push to `main` creates `v<version>`.

Without a bump, pushes still publish fresh images but no new release. The JAR's own version metadata is taken
from `version` in `package.json` too, so there is no second number to keep in step.

**For a major version, update [Upgrading](upgrading.md) in the same pull request** with what a deployment has to
change. The generated release notes list the JARs and link that page and [the screenshots](screenshots.md);
they carry no changelog of their own.

## Versions and tags

| What | Moves after it is published? |
| --- | --- |
| GitHub release `v2.0.0` and its JARs | No |
| Image tag `2.0.0` | No &mdash; pushed once, with the release |
| Image tag `sha-<commit>` | No |
| Image tag `latest` | Yes |

The release `v2.0.0` and the image `:2.0.0` always come from the same commit. Releases up to `v1.1.2` were
published to `ghcr.io/nebari-dev/nebari-keycloak-theme`, where the version tag did move; that package gets no
new versions.

## Dependencies

Dependabot runs monthly for npm, GitHub Actions and the Keycloak base image in the Dockerfile, configured in
[`.github/dependabot.yml`](../.github/dependabot.yml). The policy:

- **Minor and patch updates** arrive grouped in one pull request, with two exceptions, each pinned exactly and
  proposed in its own pull request:
  - `@biomejs/biome`, because a new version can change formatter output, so that pull request has to run
    `npm run format` too.
  - `axe-core` and `@axe-core/playwright`, because a new axe release adds rules, which can fail the
    [accessibility suites](development.md#accessibility-tests) without a code change. That pull request shows
    what the new rules find.
- **Major updates are never proposed.** Nearly every dependency sits under a peer pin from the Keycloakify,
  PatternFly and Vite stack, so a major bump fails `npm ci` with `ERESOLVE`. Take them by hand.
- **Some packages are held further:**

| Package | Why |
| --- | --- |
| `@keycloakify/*`, `@keycloak/keycloak-admin-client` | They track the Keycloak server version, not semver. Bumping them is a Keycloak upgrade &mdash; see [Ownership](ownership.md#upgrading-keycloak) |
| `react`, `react-dom` and their types | The Keycloakify and PatternFly console packages require React 18 |
| `react-hook-form` | `@keycloakify/keycloak-ui-shared` pins it to exactly `7.70.0`, so even a minor bump fails `npm ci` |
| `oidc-spa` (minors) | `@keycloakify/keycloak-ui-shared` pins it to `~10.0.x` |

Open Dependabot security alerts are tracked in
[the repository's security tab](https://github.com/nebari-dev/nebari-keycloak-theme/security/dependabot).
