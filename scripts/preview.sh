#!/usr/bin/env bash
# Serves this presentation with every round of the tournament, straight from a local build of the data.
# The full data comes from system-one-chess/viewer/dist (gitignored there).
# Usage: scripts/preview.sh [--build]   then open http://localhost:8771/?round=1&rec
set -euo pipefail
site=$(cd "$(dirname "$0")/.." && pwd)
engine=${ENGINE:-$site/../ai-chess-lab}
tournament=${TOURNAMENT:-20260922-141451-7ccf}
dist=$engine/viewer/dist
if [ "${1:-}" = --build ] || [ ! -d "$dist/data/$tournament" ]; then
  (cd "$engine" && .venv/bin/python viewer/build.py "tournaments/$tournament.json" --human-name "${HUMAN_NAME:-Human}" --out viewer/dist)
fi
# The preview folder links this repository's pages next to the full data, so page edits show up on reload.
preview=$dist/preview
mkdir -p "$preview/data"
for item in "$site"/*.html "$site"/*.js "$site"/*.css "$site"/*.webp "$site"/logos "$site"/vendor; do
  ln -sfn "$item" "$preview/"
done
ln -sfn "$dist/data/$tournament" "$preview/data/$tournament"
ln -sfn "$site/data/participants.json" "$preview/data/participants.json"
# Only this tournament is listed, so the pages open it without a ?t= parameter.
python3 -c "import json, sys; print(json.dumps([t for t in json.load(open(sys.argv[1])) if t['id'] == sys.argv[2]], indent=1))" \
  "$dist/data/tournaments.json" "$tournament" > "$preview/data/tournaments.json"
cd "$preview"
exec python3 -m http.server "${PORT:-8771}"
