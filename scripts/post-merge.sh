#!/usr/bin/env bash
# Reconcile BrightBoard after a task merge. Never publish or alter the database.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ -f package-lock.json ]]; then
  # npm is used for the app and VPS. A legacy pnpm lock may be stale.
  lockfile=package-lock.json
elif [[ -f pnpm-lock.yaml ]]; then
  lockfile=pnpm-lock.yaml
else
  echo "[post-merge] No dependency lockfile found." >&2
  exit 1
fi

fingerprint="$(sha256sum package.json "$lockfile" | sha256sum | cut -d ' ' -f 1)"
stamp=node_modules/.cache/brightboard-post-merge/dependencies.sha256
install_needed=false

if [[ ! -x node_modules/.bin/tsx || ! -x node_modules/.bin/vite ]]; then
  install_needed=true
elif [[ -f "$stamp" ]]; then
  [[ "$(cat "$stamp")" == "$fingerprint" ]] || install_needed=true
elif git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  # First run: reuse the working installation unless this merge changed deps.
  git diff --quiet HEAD^ HEAD -- package.json "$lockfile" || install_needed=true
fi

if [[ "$install_needed" == true ]]; then
  echo "[post-merge] Installing locked dependencies without lifecycle prompts."
  if [[ "$lockfile" == pnpm-lock.yaml ]]; then
    CI=true pnpm install --frozen-lockfile --ignore-scripts
  else
    npm ci --include=dev --ignore-scripts --no-audit --no-fund
  fi
else
  echo "[post-merge] Reusing unchanged dependencies."
fi

echo "[post-merge] Running service regression checks."
node_modules/.bin/tsx --test server/*.test.ts

echo "[post-merge] Rebuilding the production files used by the VPS."
npm run build

mkdir -p "$(dirname "$stamp")"
printf '%s\n' "$fingerprint" > "$stamp"
echo "[post-merge] Complete. No database migration or publishing was performed."
