#!/usr/bin/env bash
# Collect the chronicle and upload it into the volume of the Coolify service "chronik" on VPS 3,
# which serves it as chronik.pleasance.org (tailnet only). Started hourly by chronik-publish.timer.
set -euo pipefail
here=$(dirname "$(realpath "$0")")
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
cp -r "$here/site/." "$out/"
rm -f "$out/data.json"
python3 "$here/collect.py" > "$out/data.json"
volume=$(ssh vps3 "docker volume inspect -f '{{.Mountpoint}}' 64ygimrpu96g7jtxbf3uhg8k_chronik-site")
rsync -rt --delete --chmod=D755,F644 "$out/" "vps3:$volume/"
echo "published $(date '+%F %T')"
