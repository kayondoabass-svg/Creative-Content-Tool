#!/bin/bash
# Disable shell/Git diagnostics before touching credentials, even under bash -x.
set +x
set +v
set -euo pipefail
unset GIT_TRACE GIT_TRACE_PACKET GIT_TRACE_CURL GIT_CURL_VERBOSE \
  GIT_TRACE_CURL_NO_DATA GIT_TRACE2 GIT_TRACE2_EVENT GIT_TRACE2_PERF
export GIT_TERMINAL_PROMPT=0

if [ -z "${GITHUB_PAT:-}" ]; then
  echo "❌ GITHUB_PAT secret is not set. Add it in Replit Secrets."
  exit 1
fi

REPO="kayondoabass-svg/Creative-Content-Tool"
REMOTE="https://github.com/${REPO}.git"

# More-specific, invocation-only identity rewrites prevent inherited broad
# github.com rewrites from inserting a credential into Git's process arguments.
# Leave the user's global Git configuration untouched.
github_git() {
  git -c "url.$REMOTE.insteadOf=$REMOTE" \
    -c "url.$REMOTE.pushInsteadOf=$REMOTE" "$@"
}

git config user.email "agent@brightboardapp.com"
git config user.name "BrightBoard"

# Clear any stale git lock files left by Replit's auto-checkpoint
rm -f .git/index.lock .git/COMMIT_EDITMSG.lock

# Replace all saved URLs, including legacy authenticated push overrides.
git config --replace-all remote.origin.url "$REMOTE"
if git config --get-all remote.origin.pushurl >/dev/null; then
  git config --unset-all remote.origin.pushurl
fi

verify_remote() {
  # Never echo an unexpected URL: it could contain a legacy credential.
  if [ "$(github_git remote get-url --all origin)" != "$REMOTE" ] ||
     [ "$(github_git remote get-url --push --all origin)" != "$REMOTE" ]; then
    echo "Origin must use the credential-free GitHub URL." >&2
    return 1
  fi
}
verify_remote

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
# Only this push gets the helper. Its file contains code, never the token.
# A private directory outside the worktree cannot be staged by git add -A.
umask 077
credential_dir="$(mktemp -d /tmp/brightboard-git-credentials.XXXXXXXX)"
trap 'rm -rf -- "$credential_dir"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
cat > "$credential_dir/helper" <<'HELPER'
#!/bin/sh
set +x
set +v
# Ignore store/erase so no credential is ever persisted by this helper.
[ "${1:-}" = get ] || exit 0
protocol=
host=
while IFS= read -r field && [ -n "$field" ]; do
  case "$field" in
    protocol=*) protocol=${field#protocol=} ;;
    host=*) host=${field#host=} ;;
  esac
done
[ "$protocol" = https ] && [ "$host" = github.com ] || exit 0
printf 'username=x-access-token\npassword=%s\n\n' "$GITHUB_PAT"
HELPER
chmod 700 "$credential_dir/helper"
# Reset inherited helpers (including credential-store/cache). Git receives the
# token through the helper's stdout pipe, not a URL, file, or process argument.
github_git -c credential.helper= -c "credential.helper=$credential_dir/helper" \
  push -u origin main
verify_remote
echo "✅ Done. VPS just needs: git fetch origin main && git reset --hard origin/main && pm2 restart brightboard"
