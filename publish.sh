#!/usr/bin/env bash
# Collect the chronicle and upload it into the volume of the Coolify service "chronik" on VPS 3,
# which serves it as chronik.pleasance.org (tailnet only). Started daily by chronik-publish.timer.
set -euo pipefail
here=$(dirname "$(realpath "$0")")
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
cp -r "$here/site/." "$out/"
rm -f "$out/data.json"
python3 "$here/collect.py" > "$out/data.json"
rsync -rt --delete --chmod=D755,F644 "$out/" publish-chronik:
echo "published $(date '+%F %T')"
