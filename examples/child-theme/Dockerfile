# A child theme ships as the published Nebari image plus its own theme folder.
# Pin the base to a released tag so each upgrade of the parent is deliberate.
ARG NEBARI_THEME_IMAGE=quay.io/nebari/nebari-keycloak-theme:latest
FROM ${NEBARI_THEME_IMAGE}

# Keycloak reads its themes folder at runtime; no `kc.sh build` is needed.
COPY acme /opt/keycloak/themes/acme
