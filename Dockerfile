ARG KEYCLOAK_VERSION=26.8.0
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

# Repeated from the builder stage: an ENV does not cross stages, and without it
# a `start-dev`, or a `start` that re-augments, turns the management endpoints
# off again.
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

# Change the port to 8080 (non-root)
ENV KC_HTTP_PORT=8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
