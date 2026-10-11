#!/usr/bin/env bash
# Rebuilds data/basemap.json (India outline and states, projected to kilometres).
# Needs node and npx. Downloads about 4 MB of district boundaries.
set -euo pipefail
cd "$(dirname "$0")/.."
W=${WORK:-build}/geo; mkdir -p "$W"
curl -sS -o "$W/districts.geojson" https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson
npx --yes mapshaper "$W/districts.geojson" -dissolve st_nm -simplify percentage=22% keep-shapes -o "$W/states.json" format=geojson precision=0.0003
npx --yes mapshaper "$W/districts.geojson" -dissolve -simplify percentage=22% keep-shapes -o "$W/india.json" format=geojson precision=0.0003
node scripts/project_basemap.js "$W/states.json" "$W/india.json" data/basemap.json
