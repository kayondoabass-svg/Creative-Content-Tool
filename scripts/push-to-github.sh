#!/bin/bash
set -e

if [ -z "$GITHUB_PAT" ]; then
  echo "❌ GITHUB_PAT secret is not set. Add it in Replit Secrets."
  exit 1
fi

REPO="kayondoabass-svg/Creative-Content-Tool"
GITHUB_USER="kayondoabass-svg"
REMOTE="https://${GITHUB_USER}:${GITHUB_PAT}@github.com/${REPO}.git"

git config user.email "agent@brightboardapp.com"
git config user.name "BrightBoard"

# Clear any stale git lock files left by Replit's auto-checkpoint
rm -f .git/index.lock .git/COMMIT_EDITMSG.lock

# Set the authenticated remote
git remote set-url origin "$REMOTE"

# Build dist/ so the VPS only needs to pull + restart (no build tools needed there)
echo "🔨 Building..."
npm run build

# Stage all changes (including freshly built dist/) and commit
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  COMMIT_MSG="${1:-Deploy: $(date '+%Y-%m-%d %H:%M')}"
  git commit -m "$COMMIT_MSG"
else
  echo "Nothing new to commit."
fi

echo "🚀 Pushing to GitHub..."
git push -u origin main
echo "✅ Done. VPS just needs: git reset --hard origin/main && pm2 restart brightboard"
