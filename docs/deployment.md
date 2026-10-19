# Deployment

Getting the theme into Keycloak and switching it on are two separate steps. Installing makes the themes
available; [selecting one](#selecting-the-theme) on a realm is what users actually see. Coming from 1.x, read
[Upgrading](upgrading.md) first.

## What gets built

`npm run build-keycloak-theme` writes two JARs per theme to `dist_keycloak/`. Use the one that matches your
theme and your Keycloak:

| File | Theme | Keycloak |
| --- | --- | --- |
| `nebari-keycloak-theme-for-kc-all-other-versions.jar` | Nebari | 26 and newer |
| `nebari-keycloak-theme-for-kc-22-to-25.jar` | Nebari | 22 to 25 |
| `template-keycloak-theme-for-kc-all-other-versions.jar` | Template | 26 and newer |
| `template-keycloak-theme-for-kc-22-to-25.jar` | Template | 22 to 25 |

Install one per theme, by name. A glob like `nebari-keycloak-theme-*.jar` matches both Keycloak ranges. To build
a single theme, run `npm run build-keycloak-theme -- --theme nebari`.

Each release on GitHub attaches every JAR, so you don't need to build them yourself.

## Installing

### The published image

Every push to `main` publishes a complete Keycloak image, `quay.io/nebari/nebari-keycloak-theme`, for
`linux/amd64` and `linux/arm64`, with the Keycloak 26 JAR of every theme in [`themes.json`](../themes.json). It
is based on `quay.io/keycloak/keycloak:26.8.1`. Its tags:

| Tag | Published | Moves? |
| --- | --- | --- |
| `sha-<commit>` | Every push to `main` | Never. **Pin this one** for anything reproducible |
| `<version>`, e.g. `2.0.0` | Once, with the GitHub release for that version | Never |
| `latest` | Every push to `main` | Yes |

See [Releasing](releasing.md#versions-and-tags).

The image's entrypoint is `kc.sh`, so pass `start` (or `start-dev`) and your usual configuration.

### Your own Keycloak image

If you already build a Keycloak image, add the JAR as a provider and rebuild:

```dockerfile
FROM quay.io/keycloak/keycloak:26.8.1 AS builder
COPY nebari-keycloak-theme-for-kc-all-other-versions.jar /opt/keycloak/providers/
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.8.1
COPY --from=builder /opt/keycloak/ /opt/keycloak/
```

This repo's own [`Dockerfile`](../Dockerfile) is the working version of this, with the JAR name as a build
argument. Its default `THEME_JAR` installs every theme's Keycloak 26 JAR, which is what both the local compose
image and the published image use; narrow it to one file for an image that carries a single theme.

### An existing Keycloak

Copy the JAR into Keycloak's `providers/` directory and restart it. On Kubernetes that usually means an init
container or a volume that places the JAR in `/opt/keycloak/providers/`. Keycloak picks up providers at build
time, so an optimised deployment needs `kc.sh build` to run again after the JAR changes.

## Selecting the theme

A theme applies per realm. In the Admin Console of the realm you want to change, open
**Realm settings &rarr; Themes** and set:

| Setting | Value |
| --- | --- |
| Login theme | `nebari` |
| Admin console theme | `nebari` |
| Account theme | `nebari` |

Use `template` instead for the unbranded theme, the starting point for a brand of your own. A realm that still
selects `collab` or `openteams` needs moving first; see [Upgrading](upgrading.md#the-collab-theme-is-gone).

Leave **Email theme** alone &mdash; this theme doesn't provide one.

The same setting in a realm export, which is how the local dev realm does it in
[`realm-export.json`](../realm-export.json):

```json
{
  "loginTheme": "nebari",
  "adminTheme": "nebari",
  "accountTheme": "nebari"
}
```

The `master` realm is selected separately. If you theme a workspace realm but not `master`, administrators who
sign in through `master` still see the stock console.

## Branding a realm

Two ways to put your own brand on the theme, neither of which needs a fork:

- **Theme customization.** The Admin Console's **Configure &rarr; Theme customization** page, open to realm
  administrators with `manage-realm`, rebrands that realm's login pages at runtime. The result is stored in the
  realm, so it survives restarts; to have a fresh database start branded, seed a preset into the realm export
  or through the Admin API, as described in
  [Seeding a preset](theme-customization.md#seeding-a-preset-so-a-realm-starts-branded). A deployment that
  doesn't want the page sets `NEBARI_THEME_CUSTOMIZATION=disabled` on the Keycloak container.
- **A child theme.** A theme with `parent=nebari`, shipped as the published image plus your own theme folder.
  [`examples/child-theme/`](../examples/child-theme/) is a complete one with its Dockerfile; see
  [Child themes](child-themes.md).

## Nebari Infrastructure Core

NIC doesn't select this theme by default yet. Its Keycloak runs the stock image and no NIC component sets a
realm theme. Adopting it means two changes on the NIC side:

1. Run a Keycloak that has the theme installed &mdash; the published image, or the JAR added to the existing one
2. Set the three theme keys on the realms NIC manages

## Known issues in the shipped configuration

- **Health checks are on the management port.** The image enables them, and Keycloak 26 serves `/health/ready`
  on port `9000`, not `8080`. Point readiness probes there.
- **Behind a TLS-terminating proxy,** set `KC_PROXY_HEADERS=xforwarded`, and `KC_HTTP_ENABLED=true` for a
  non-dev `start`. The image sets neither, because both depend on your ingress.
- **Set `KC_HOSTNAME` to the public URL.** The image keeps Keycloak's strict hostname default, so `start` fails
  without it. Nebari Infrastructure Core already sets it; only the local compose file turns strict checking off.
- **The Keycloak 22 to 25 JAR is built but not tested.** CI and the screenshots run against Keycloak 26, and
  the consoles are built from Keycloak 26.5 sources.
- **[`k8s-deployment-example.yaml`](../k8s-deployment-example.yaml) is a sketch.** It runs stock
  `quay.io/keycloak/keycloak` and copies the theme JARs in from this image with an init container. It uses
  `latest` for readability; pin a `sha-<commit>` or version tag in a real deployment.
