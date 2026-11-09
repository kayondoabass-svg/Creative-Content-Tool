#!/usr/bin/env bash
# BrightBoard only. No install, migration, environment rewrite or global restart.
set +x
set -euo pipefail
RELEASE="${1:?Pass the exact approved release revision}"
[[ "$RELEASE" =~ ^[a-f0-9]{40}$ ]] || { echo "Invalid release revision."; exit 1; }
cd /var/www/brightboardapp.com
export PATH="/opt/brightboard-node22/bin:$PATH"
node -e 'const [a,b]=process.versions.node.split(".").map(Number);if(a<22||(a===22&&b<13))process.exit(1)'
test -f .env
git fetch --quiet origin main
test "$(git rev-parse origin/main)" = "$RELEASE" || { echo "GitHub main changed. Stop and confirm the intended release."; exit 1; }
git cat-file -e "$RELEASE^{commit}"
CURRENT="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$CURRENT" "$RELEASE" || { echo "Local history diverges. No files were reset."; exit 1; }
git diff --quiet "$CURRENT" "$RELEASE" -- package.json || { echo "Dependency changes need a separate deployment."; exit 1; }
umask 077
BACKUP="/root/brightboard-backups/$(date -u +%Y%m%dT%H%M%SZ)-reference-sharing"
mkdir -p "$BACKUP"
printf '%s\n' "$CURRENT" > "$BACKUP/previous-revision"
git diff --binary > "$BACKUP/local-tracked.patch"
cp -p package-lock.json "$BACKUP/package-lock.json"
tar -czf "$BACKUP/previous-runtime.tgz" dist/index.cjs dist/public/index.html
if test -f .release.json; then cp -p .release.json "$BACKUP/release.json"; fi
git reset --hard "$RELEASE"
# Preserve the VPS's repaired download addresses; no dependency install needed.
cp -p "$BACKUP/package-lock.json" package-lock.json
node --check dist/index.cjs
node scripts/release-manifest.cjs "$RELEASE"
pm2 restart brightboard --interpreter /opt/brightboard-node22/bin/node
node --env-file=.env --input-type=module <<'NODE'
import { spawnSync } from "node:child_process";
const port = process.env.PORT || "5000";
if (!/^\d+$/.test(port)) throw new Error("Invalid BrightBoard port.");
const check = spawnSync(process.execPath, ["scripts/verify-release.cjs", `http://127.0.0.1:${port}`], { stdio: "inherit" });
process.exit(check.status ?? 1);
NODE
pm2 status brightboard
echo "PASS: BrightBoard origin release verified."
echo "Private backup: $BACKUP"
echo "Other websites, database, .env and sharing storage configuration were not changed."
