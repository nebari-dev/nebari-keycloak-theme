# Example child theme: `acme`

A complete child of the Nebari theme, used to check the child-theme hooks and as a starting point. It changes
the primary colour and console header, replaces the logo, and rewords two login strings. Nothing else is
copied from the parent.

See [`docs/child-themes.md`](../../docs/child-themes.md) for how it works and what a child can change.

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

[`Dockerfile`](Dockerfile) builds on the published Nebari image and adds the theme folder:

```bash
docker build -t acme-keycloak-theme examples/child-theme
```
