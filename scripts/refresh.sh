#!/usr/bin/env bash
# Checks whether the upstream timetable file changed. If it did (or FORCE=1), rebuilds
# data/timetable.json and index.html, validates them and updates data/SOURCE.json.
# Writes changed=true|false to $GITHUB_OUTPUT when run in GitHub Actions.
set -euo pipefail
cd "$(dirname "$0")/.."
W=${WORK:-build}; OUT=${GITHUB_OUTPUT:-/dev/null}; mkdir -p "$W"
rm -rf "$W/railways-mcp"
git clone --depth 1 -q https://github.com/shubhamyadav8901/railways-mcp.git "$W/railways-mcp"
SRC="$W/railways-mcp/data"
SHA=$(git -C "$W/railways-mcp" rev-parse --short HEAD)
NEW=$(cat "$SRC/tag2026.json.gz" "$SRC/station_equivalences.json" | sha256sum | cut -d' ' -f1)
OLD=$(python3 -I -c "import json; print(json.load(open('data/SOURCE.json'))['sha256'])" 2>/dev/null || echo none)
if [ "$NEW" = "$OLD" ] && [ -z "${FORCE:-}" ]; then
  echo "Upstream timetable unchanged (upstream commit $SHA). Nothing to do."
  echo "changed=false" >> "$OUT"; exit 0
fi
echo "Upstream timetable changed or rebuild forced. Rebuilding from upstream commit $SHA."
python3 -I scripts/build_timetable.py "$SRC" data/timetable.json "$SHA"
python3 -I scripts/assemble.py src/template.html src/engine.js data/timetable.json data/basemap.json index.html
node scripts/validate.js
python3 -I - "$NEW" "$SHA" <<'PY'
import json, sys, datetime
json.dump({'upstream': 'https://github.com/shubhamyadav8901/railways-mcp', 'upstream_commit': sys.argv[2], 'sha256': sys.argv[1],
           'files': ['data/tag2026.json.gz', 'data/station_equivalences.json'], 'refreshed': datetime.date.today().isoformat()},
          open('data/SOURCE.json', 'w'), indent=1)
PY
echo "changed=true" >> "$OUT"
