---
name: VPS requires dist rebuild after source changes
description: The VPS serves pre-built dist/ files committed to git. Editing source files without rebuilding means VPS users see no change.
---

## The rule
After any frontend source file edit, always run `npm run build` before committing and pushing to GitHub. The VPS does `git reset --hard origin/main` and serves whatever dist/ is in the repo — it does NOT build on deploy.

**Why:** Multiple times fixes were committed (routes.ts, generated-content-display.tsx, main.tsx, home.tsx) but the VPS still showed old behavior because the dist/ in git was stale. Only after running `npm run build` and committing the new dist/ did the VPS receive the actual changes.

**How to apply:** Every session that touches client/ or server/ files: run `npm run build`, commit dist/ along with the source changes, push, then deploy on VPS.

## Avoid redundant external CI builds

For this pre-built VPS deployment, validate the committed artifacts before rollout rather than making a second build on GitHub a deployment prerequisite.

**Why:** The VPS does not use the GitHub runner's build output. Replit-generated lockfiles can also contain internal package-registry URLs that external runners cannot reach; an incomplete npm installation can then misleadingly report a missing build tool.

**How to apply:** Keep building before pushing application changes. If a future deployment genuinely needs a fresh external CI build, first make dependency resolutions portable and verify a clean installation outside Replit.
