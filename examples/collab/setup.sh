#!/usr/bin/env bash
# Points the compose loop's realm at the collab child theme and publishes the
# Collab preset to it. `--revert` points the realm back at the nebari theme and
# leaves the published preset in place.
#
# Usage, from the repository root, with the compose loop running:
#   examples/collab/setup.sh [--revert]
set -euo pipefail

CONTAINER="${CONTAINER:-keycloak-nebari}"
REALM="${REALM:-nebari}"
PRESET="$(dirname "$0")/collab-preset.json"

kcadm() { docker exec "$CONTAINER" /opt/keycloak/bin/kcadm.sh "$@"; }

kcadm config credentials --server http://localhost:8080 --realm master --user admin --password admin

if [[ "${1:-}" == "--revert" ]]; then
    kcadm update "realms/$REALM" -s loginTheme=nebari -s accountTheme=nebari -s adminTheme=nebari
    echo "Realm $REALM is back on the nebari theme."
    exit 0
fi

if ! docker exec "$CONTAINER" test -f /opt/keycloak/themes/collab/login/theme.properties; then
    echo "The collab theme is not mounted. Start Keycloak with examples/collab/compose.collab.yml." >&2
    exit 1
fi

# The value Publish theme writes: the preset's config, base64-encoded behind a
# `base64:` prefix, under the nebariBrandingConfig key of every supported locale plus en.
value="base64:$(jq -c .config "$PRESET" | base64 -w0)"
jq -n --arg v "$value" '{nebariBrandingConfig: $v}' | docker exec -i "$CONTAINER" sh -c 'cat > /tmp/branding.json'

locales=$( (kcadm get "realms/$REALM" --fields supportedLocales | jq -r '.supportedLocales[]?'; echo en) | sort -u)
for locale in $locales; do
    kcadm create "realms/$REALM/localization/$locale" -f /tmp/branding.json
    echo "Published the Collab preset for locale $locale."
done

kcadm update "realms/$REALM" -s loginTheme=collab -s accountTheme=collab -s adminTheme=collab
echo "Realm $REALM now uses the collab theme."
