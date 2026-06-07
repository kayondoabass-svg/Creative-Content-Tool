---
name: VPS requires dist rebuild after source changes
description: The VPS serves pre-built dist/ files committed to git. Editing source files without rebuilding means VPS users see no change.
---

## The rule
After any frontend source file edit, always run `npm run build` before committing and pushing to GitHub. The VPS does `git reset --hard origin/main` and serves whatever dist/ is in the repo — it does NOT build on deploy.

**Why:** Multiple times fixes were committed (routes.ts, generated-content-display.tsx, main.tsx, home.tsx) but the VPS still showed old behavior because the dist/ in git was stale. Only after running `npm run build` and committing the new dist/ did the VPS receive the actual changes.

**How to apply:** Every session that touches client/ or server/ files: run `npm run build`, commit dist/ along with the source changes, push, then deploy on VPS.
