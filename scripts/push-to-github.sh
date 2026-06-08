#!/bin/bash
set -e

if [ -z "$GITHUB_PAT" ]; then
  echo "❌ GITHUB_PAT secret is not set. Add it in Replit Secrets."
  exit 1
fi

REPO="kayondoabass-svg/Creative-Content-Tool"
REMOTE="https://${GITHUB_PAT}@github.com/${REPO}.git"

git config user.email "agent@brightboardapp.com"
git config user.name "BrightBoard"

# Set the authenticated remote (never stored in plain text in git config)
git remote set-url origin "$REMOTE"

# Stage all changes and commit if there's anything new
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git status --porcelain)" ]; then
  git add -A
  COMMIT_MSG="${1:-Auto-deploy: $(date '+%Y-%m-%d %H:%M')}"
  git commit -m "$COMMIT_MSG" || echo "Nothing new to commit."
fi

echo "🚀 Pushing to GitHub..."
git push -u origin main
echo "✅ Pushed to GitHub successfully."
