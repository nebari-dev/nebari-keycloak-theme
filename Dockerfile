ARG KEYCLOAK_VERSION=26.0
# Which theme JARs to install. The default takes every theme that was built, so
# a local `docker compose up --build` can switch a realm between them. Narrow it
# to one file to publish an image carrying a single theme.
ARG THEME_JAR=*-keycloak-theme-for-kc-all-other-versions.jar

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS builder
ARG THEME_JAR

# Enable health and metrics support
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

# Copy the custom theme
WORKDIR /opt/keycloak
# A directory destination, so ${THEME_JAR} may match more than one file.
COPY dist_keycloak/${THEME_JAR} /opt/keycloak/providers/

# Build Keycloak with the custom theme
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION}
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Change the port to 8080 (non-root)
ENV KC_HTTP_PORT=8080
ENV KC_HOSTNAME_STRICT=false
ENV KC_PROXY=edge
# Re-declared here on purpose: `ENV` does not cross build stages, so setting
# these only in the builder left the runtime image with no management
# interface — port 9000 never opened and `/health/ready` 404'd on 8080.
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
