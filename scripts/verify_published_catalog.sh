#!/usr/bin/env bash
# Read-only check of the published catalog (ADR-005). Run after every deploy and publish.
#
#   scripts/verify_published_catalog.sh [manifest-url]
#
# Downloads version_v2.json and the snapshot it points to, then verifies size, md5,
# SQLite integrity, schema version and the FTS index. Never writes to the server.
set -euo pipefail

MANIFEST_URL="${1:-https://lalira.app/catalogo/version_v2.json}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fail() { echo "✖ $*" >&2; exit 1; }
ok() { echo "✔ $*"; }

curl -fsS -H 'Cache-Control: no-cache' "$MANIFEST_URL" -o "$WORK/manifest.json" || fail "No se pudo descargar $MANIFEST_URL"
field() { python3 -c "import json,sys; v=json.load(open('$WORK/manifest.json')).get('$1'); print('' if v is None else v)"; }

VERSION="$(field version)"; URL="$(field url)"; SIZE="$(field size)"
CATALOG_VERSION="$(field catalogVersion)"; SCHEMA="$(field schemaVersion)"; MD5="$(field md5)"
echo "Manifiesto: version=$VERSION catalogVersion=${CATALOG_VERSION:-—} schemaVersion=${SCHEMA:-—}"
echo "            url=$URL"

[ -n "$VERSION" ] && [ -n "$URL" ] && [ -n "$SIZE" ] || fail "Faltan campos que leen los binarios publicados (version, url, size)"
ok "Campos legados presentes"

[ -n "$CATALOG_VERSION" ] && [ -n "$SCHEMA" ] && [ -n "$MD5" ] || fail "Manifiesto legado: faltan catalogVersion/schemaVersion/md5 (¿se publicó con el publicador ADR-005?)"
[[ "$URL" =~ catalogo_v2_${CATALOG_VERSION}\.sqlite$ ]] || fail "La url no apunta al snapshot de catalogVersion $CATALOG_VERSION"
ok "Manifiesto ADR-005"

curl -fsS "$URL" -o "$WORK/catalog.sqlite" || fail "No se pudo descargar el snapshot"
ACTUAL_SIZE="$(wc -c < "$WORK/catalog.sqlite" | tr -d ' ')"
[ "$ACTUAL_SIZE" = "$SIZE" ] || fail "size no coincide: manifiesto=$SIZE archivo=$ACTUAL_SIZE"
ok "size coincide ($SIZE bytes)"

ACTUAL_MD5="$( (md5 -q "$WORK/catalog.sqlite" 2>/dev/null) || md5sum "$WORK/catalog.sqlite" | cut -d' ' -f1)"
[ "$ACTUAL_MD5" = "$MD5" ] || fail "md5 no coincide: manifiesto=$MD5 archivo=$ACTUAL_MD5"
ok "md5 coincide"

DB="$WORK/catalog.sqlite"
[ "$(sqlite3 "$DB" 'PRAGMA quick_check;')" = "ok" ] || fail "quick_check falló"
ok "quick_check"
[ "$(sqlite3 "$DB" 'PRAGMA user_version;')" = "$SCHEMA" ] || fail "user_version no coincide con schemaVersion"
ok "user_version = $SCHEMA"
sqlite3 "$DB" "INSERT INTO estrofa_fts(estrofa_fts, rank) VALUES('integrity-check', 1);" 2>/dev/null || fail "Índice FTS desincronizado"
ok "Índice FTS consistente"
SONGS="$(sqlite3 "$DB" 'SELECT COUNT(*) FROM cancion;')"
[ "$SONGS" -gt 0 ] || fail "Catálogo sin canciones"
ok "$SONGS canciones"

echo "Catálogo publicado verificado."
