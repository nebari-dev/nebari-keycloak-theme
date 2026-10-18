# A child theme ships as the published Nebari image plus its own theme folder.
# Pin the base to a released tag, never `latest`, so each upgrade of the parent
# is a deliberate bump of this line.
ARG NEBARI_THEME_IMAGE=quay.io/nebari/nebari-keycloak-theme:2.0.0
FROM ${NEBARI_THEME_IMAGE}

# Keycloak reads its themes folder at runtime; no `kc.sh build` is needed.
COPY acme /opt/keycloak/themes/acme
