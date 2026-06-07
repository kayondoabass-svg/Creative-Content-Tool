---
name: VPS deploy pattern
description: Safe deploy command for brightboardapp.com VPS; pitfalls to avoid
---

## Deploy command (always use this)
```bash
cd /var/www/brightboardapp.com && git fetch origin main && git reset --hard origin/main && npm install --omit=dev --ignore-scripts --no-audit && pm2 restart brightboard
```

**Why:** `git pull` aborts when local dist/ files differ from remote. `git reset --hard` forces the working tree to match remote regardless of local changes or untracked files.

**Why:** Never use `pm2 restart --update-env` — it resets environment variables.

## dist/ is committed to git
The built `dist/` folder (dist/index.cjs, dist/public/) is committed to the repo so the VPS never needs a build step. After any code change on Replit: build locally → checkpoint auto-commits → VPS pulls.

## VPS specs and swap
- 1 vCPU, 1 GB RAM — OOM kills npm install without swap
- 2 GB swapfile active at /swapfile (already set up)
- Use `--ignore-scripts --no-audit` to skip fluent-ffmpeg post-install hang

## node_modules corruption
If npm install fails with ENOTEMPTY, run:
```bash
find node_modules -maxdepth 3 -name '.*-????????' -type d -exec rm -rf {} + 2>/dev/null
npm install --omit=dev --ignore-scripts --no-audit
```

## pm2 logs flood base64
pm2 logs output floods terminal with base64 image data. Use `--nostream` and `--lines N`. Press `q` or Ctrl+C to escape if stuck.

## pm2 flush
Run `pm2 flush` to clear accumulated old error logs before testing a fix — otherwise old errors look like new ones.

## PM2 "Process not found" recovery
If `pm2 restart brightboard` says "Process not found" (process list lost after hard crash), start fresh with:
```bash
pm2 start dist/index.cjs --name brightboard --node-args="--env-file=.env" && pm2 save
```
Then if a ghost duplicate appears (two entries), delete the old one: `pm2 delete 0 && pm2 save`.
**Why:** Plain `pm2 start dist/index.cjs --name brightboard` launches without env vars → DATABASE_URL crash. The `--node-args="--env-file=.env"` flag (Node 20 native) loads the .env file automatically.
