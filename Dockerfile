ARG KEYCLOAK_VERSION=26.0
ARG THEME_JAR=keycloak-theme-for-kc-all-other-versions.jar

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS builder
ARG THEME_JAR

# Enable health and metrics support
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

# Copy the custom theme
WORKDIR /opt/keycloak
COPY dist_keycloak/${THEME_JAR} /opt/keycloak/providers/nebari-theme.jar

# Build Keycloak with the custom theme
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION}
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Change the port to 8080 (non-root)
ENV KC_HTTP_PORT=8080
ENV KC_HOSTNAME_STRICT=false
ENV KC_PROXY=edge

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
