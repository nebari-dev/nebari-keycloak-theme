# Example child theme: `acme`

A complete child of the Nebari theme, used to check the child-theme hooks and as a starting point. It changes
the primary colour and console header, replaces the logo, and rewords two login strings. Nothing else is
copied from the parent.

See [`docs/child-themes.md`](../../docs/child-themes.md) for how it works and what a child can change.

The logos are `resources/dist/logo/nebari-logo-light.svg` and `-dark.svg` in each of `login/`, `account/` and
`admin/`, at the same path as the parent's, which is what makes them replace it. Watch for a `dist/` rule in your
own `.gitignore`: it matches those folders too, and the logos were missing from this example for that reason.

## Try it in the compose loop

From the repository root:

```bash
cat > compose.child.yml <<'EOF'
services:
  keycloak:
    volumes:
      - ./examples/child-theme/acme:/opt/keycloak/themes/acme:ro
EOF
docker compose -f docker-compose.yml -f compose.child.yml up -d --build keycloak
```

Then set the `nebari` realm's login, account and admin themes to `acme` under **Realm settings &rarr; Themes**.

## Ship it as an image

[`Dockerfile`](Dockerfile) builds on a pinned release of the published Nebari image and adds the theme folder.
Bump the tag in `NEBARI_THEME_IMAGE` to take a new release of the parent:

```bash
docker build -t acme-keycloak-theme examples/child-theme
```
