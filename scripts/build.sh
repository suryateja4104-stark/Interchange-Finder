#!/usr/bin/env bash
# Rebuilds data/timetable.json from the latest upstream file and then index.html.
# For the change-detecting version used by the monthly job, see refresh.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
W=${WORK:-build}; mkdir -p "$W"
if [ -d "$W/railways-mcp/.git" ]; then git -C "$W/railways-mcp" pull --ff-only -q; else git clone --depth 1 -q https://github.com/shubhamyadav8901/railways-mcp.git "$W/railways-mcp"; fi
SHA=$(git -C "$W/railways-mcp" rev-parse --short HEAD)
python3 -I scripts/build_timetable.py "$W/railways-mcp/data" data/timetable.json "$SHA"
python3 -I scripts/assemble.py src/template.html src/engine.js data/timetable.json data/basemap.json index.html
