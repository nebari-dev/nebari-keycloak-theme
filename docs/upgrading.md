# Upgrading

What changes between major versions, and what a deployment has to do about it. Minor and patch releases need
nothing beyond pulling the new image or JAR.

## From 1.x to 2.0

### The Collab theme is gone

1.x shipped two themes, `nebari` and `collab`. 2.0 ships `nebari` and the unbranded `template`. Collab is an
OpenTeams product built on Nebari, so its branding moved out of this repository.

**Before upgrading,** switch every realm that selects `collab`, or the older `openteams`, to `nebari`: its
login, account and admin themes, under **Realm settings &rarr; Themes**. A realm left on a theme that no
longer exists won't render this theme's pages.

To keep the Collab look, import the Collab preset with the Admin Console's
[Theme customization](theme-customization.md) page, or seed it into the realm. The preset is attached to
[this comment](https://github.com/nebari-dev/nebari-keycloak-theme/pull/49#issuecomment-6243889566). Anything
beyond what the preset carries can be a [child theme](child-themes.md) in its own repository.

### The image moved to Quay

| | 1.x | 2.0 |
| --- | --- | --- |
| Image | `ghcr.io/nebari-dev/nebari-keycloak-theme` | `quay.io/nebari/nebari-keycloak-theme` |
| Architectures | amd64 | amd64 and arm64 |
| Version tag | Moved on every push until the next bump | Pushed once, with the release; never moves |
| Collab image | `ghcr.io/nebari-dev/collab-keycloak-theme` | None |

The ghcr.io packages stay pullable but get no new versions. Pin `quay.io/nebari/nebari-keycloak-theme:<version>`,
or a `sha-<commit>` tag. See [Deployment](deployment.md#the-published-image).

### The image no longer sets hostname and proxy options

The 1.x image set `KC_HOSTNAME_STRICT=false` and `KC_PROXY=edge`. 2.0 sets neither, because both depend on the
deployment:

- **Set `KC_HOSTNAME`** to Keycloak's public URL. With Keycloak's strict hostname default back on, a non-dev
  `start` fails without it. Nebari Infrastructure Core already sets it.
- **Behind a TLS-terminating proxy,** set `KC_PROXY_HEADERS=xforwarded`, and `KC_HTTP_ENABLED=true` for a
  non-dev `start`. `KC_PROXY` is a Keycloak 25-and-earlier option.

The image does now enable health and metrics in the running stage too. Keycloak 26 serves `/health/ready` on the
management port, `9000`, so point readiness probes there.

### New in 2.0, nothing to migrate

- The **Theme customization** page in the Admin Console rebrands a realm's login pages at runtime. It is on by
  default; `NEBARI_THEME_CUSTOMIZATION=disabled` hides it. See [Theme customization](theme-customization.md).
- **Child themes**: a theme with `parent=nebari` can add its own CSS, logos and login wording. See
  [Child themes](child-themes.md).
- The `template` theme, an unbranded starting point.
- A **Register** link on the sign-in page when the realm allows self-registration.
- The image is built on Keycloak 26.8.1.
