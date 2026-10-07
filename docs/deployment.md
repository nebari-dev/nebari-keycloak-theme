# Deployment

Getting the theme into Keycloak and switching it on are two separate steps. Installing makes `nebari` available;
[selecting it](#selecting-the-theme) on a realm is what users actually see.

## What gets built

`npm run build-keycloak-theme` writes two JARs per brand to `dist_keycloak/`. Use the one that matches your
brand and your Keycloak:

| File | Brand | Keycloak |
| --- | --- | --- |
| `nebari-keycloak-theme-for-kc-all-other-versions.jar` | Nebari | 26 and newer |
| `nebari-keycloak-theme-for-kc-22-to-25.jar` | Nebari | 22 to 25 |
| `collab-keycloak-theme-for-kc-all-other-versions.jar` | Collab | 26 and newer |
| `collab-keycloak-theme-for-kc-22-to-25.jar` | Collab | 22 to 25 |

Install one per brand, by name. A glob like `nebari-keycloak-theme-*.jar` matches both Keycloak ranges. To build
a single brand, run `npm run build-keycloak-theme -- --theme collab`.

Each release on GitHub attaches all four JARs, so you don't need to build them yourself.

## Installing

### The published image

Every push to `main` publishes one complete Keycloak image per brand, each with only its own theme built in:

| Brand | Image |
| --- | --- |
| Nebari | `ghcr.io/nebari-dev/nebari-keycloak-theme` |
| Collab | `ghcr.io/nebari-dev/collab-keycloak-theme` |

Both are based on `quay.io/keycloak/keycloak:26.5.0` and use the brand's Keycloak 26 JAR. Each gets three tags:

| Tag | Moves? |
| --- | --- |
| `sha-<commit>` | Never. **Pin this one** for anything reproducible |
| `<version>`, e.g. `1.0.0` | Yes &mdash; republished on every push until the version is bumped |
| `latest` | Yes, on every push |

`<version>` looks immutable and isn't: a new commit on `main` overwrites it without changing the number. See
[Releasing](releasing.md#versions-and-tags).

The image's entrypoint is `kc.sh`, so pass `start` (or `start-dev`) and your usual configuration.

### Your own Keycloak image

If you already build a Keycloak image, add the JAR as a provider and rebuild:

```dockerfile
FROM quay.io/keycloak/keycloak:26.5.0 AS builder
COPY nebari-keycloak-theme-for-kc-all-other-versions.jar /opt/keycloak/providers/
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.5.0
COPY --from=builder /opt/keycloak/ /opt/keycloak/
```

This repo's own [`Dockerfile`](../Dockerfile) is the working version of this, with the Keycloak version and JAR
name as build arguments. Its default `THEME_JAR` installs every brand's Keycloak 26 JAR, which is what the local
compose image uses; the publish workflow narrows it to one.

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

For Collab, set all three to `collab`. A realm that still selects `openteams`, Collab's old name, must be
switched to `collab`.

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

## Nebari Infrastructure Core

NIC doesn't select this theme yet. Its Keycloak runs the stock image and no NIC component sets a realm theme.
Adopting it means two changes on the NIC side:

1. Run a Keycloak that has the theme installed &mdash; the published image, or the JAR added to the existing one
2. Set the three theme keys on the realms NIC manages

## Known issues in the shipped configuration

- **Health checks moved in Keycloak 26.** With `KC_HEALTH_ENABLED=true`, `/health/ready` is served on the
  management port, `9000`, not on `8080`. Point readiness probes there. The compose healthcheck in this repo
  still targets `8080` and uses `curl`, which the Keycloak image doesn't ship, so it never reports healthy &mdash;
  it doesn't stop Keycloak from starting.
- **`KC_PROXY=edge` is a Keycloak 25-and-earlier option.** Keycloak 26 still starts with it but logs an error.
  Behind a TLS-terminating proxy, use `KC_PROXY_HEADERS=xforwarded`, and `KC_HTTP_ENABLED=true` for a non-dev
  `start`.
- **[`k8s-deployment-example.yaml`](../k8s-deployment-example.yaml) predates Keycloak 26** and doesn't use this
  image. Treat it as a sketch, not a working manifest.
