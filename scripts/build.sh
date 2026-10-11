#!/usr/bin/env bash
# Rebuilds data/timetable.json from the official 2026 timetable and then index.html.
set -euo pipefail
cd "$(dirname "$0")/.."
W=${WORK:-build}; mkdir -p "$W"
[ -d "$W/railways-mcp" ] || git clone --depth 1 https://github.com/shubhamyadav8901/railways-mcp.git "$W/railways-mcp"
python3 -I scripts/build_timetable.py "$W/railways-mcp/data" data/timetable.json
python3 -I scripts/assemble.py src/template.html src/engine.js data/timetable.json data/basemap.json index.html
