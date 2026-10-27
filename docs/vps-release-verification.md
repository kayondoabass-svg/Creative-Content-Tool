# VPS release verification

BrightBoard stays on the existing external VPS. This workflow does not migrate
databases, remove uploaded files, change Cloudflare rules, or replace PM2's
environment. Production still runs committed `dist/`; build locally before
merging application changes. The runner validates these artifacts without
installing dependencies.

## Secure setup (deployment currently blocked until configured)

In the GitHub repository, open **Settings → Secrets and variables → Actions**.
An authorized VPS administrator must add these repository secrets directly there:

- `VPS_HOST`: existing VPS hostname/address.
- `VPS_USER`: existing deployment account.
- `SSH_PRIVATE_KEY`: a dedicated deployment key whose public key is authorized
  for that account. Generate/store it securely; never paste it into chat, source,
  logs, or a workflow argument.
- `VPS_FINGERPRINT`: the SSH host key's SHA256 fingerprint, confirmed through the
  VPS provider's trusted console. Do not trust an unverified network key scan.

Replit workspace secrets do not configure GitHub Actions secrets. Restrict
repository access and use the least-privileged deployment account compatible
with the existing directory and PM2 setup. Rotate/revoke keys when access changes.
No live deployment is performed by this task. Merge the changes and use the
repository's normal release process after setup is complete.

`RELEASE_PUBLIC_URL` is an optional non-secret GitHub Actions repository variable
for the approved canonical public HTTPS hostname. It defaults to the existing
hostname in this project's sitemap.

## What a pass means

1. Committed server syntax, client entry assets, standalone TV assets and the
   compiled `/brightboardtv` client route are present.
2. Required credentials exist. Otherwise the job fails with **BLOCKED — build
   verified; deployment did not run**. A green build is not a rollout.
3. SSH verifies the host fingerprint and resets to the triggering commit, not
   whichever commit happens to be latest on main.
4. A non-sensitive, git-ignored `.release.json` holds that revision and artifact
   SHA256 hashes. The process captures its identity and its actual server bundle
   hash once at startup. `/api/release` exposes only revision/schema/server hash,
   with `Cache-Control: no-store`; an unstamped or inconsistent build returns 503.
   It never reads a newer stamp per request, so an old process cannot claim a
   newly copied release.
5. The verifier checks the running revision/hash, hosted relay's read-only health
   contract, both clients' exact entry asset hashes, the guide's application
   entrypoints, and the precise sitemap guide entry. HTML from an SPA fallback
   cannot pass an API, asset or sitemap check. Guide SEO injections are allowed.
6. The same checks run on the VPS loopback interface and through public HTTPS.
   Retries are bounded (six attempts, five-second delays, ten-second request
   timeouts), use cache-busting queries, and do not follow redirects.

Only both origin and public success produces **VERIFIED rollout**. HTTP
401/403/429 or Cloudflare's challenge header produces a distinct **BLOCKED**
message (verifier exit 2); wrong revision/content/network errors exit 1.
If origin passes but public probes cannot pass, the job remains failed and says
**Origin verified; public rollout NOT confirmed**. This deliberately does not
claim that an SSH restart proves the public website updated. Keep protections
enabled; investigate the result with an authorized administrator rather than
disabling WAF/bot protection or exposing the origin.

The checks never create presentation sessions or modify production data.
Manual restarts retain PM2's environment; fallback startup uses
`ecosystem.config.cjs`, including its native `.env` loading. No `--update-env`,
`git clean`, dependency reinstall, or database migration is added.

## Local checks

```sh
node --test scripts/release.test.cjs
npm run build
node --check dist/index.cjs
node scripts/release-manifest.cjs "$(git rev-parse HEAD)"
```

The generated local stamp is not a production rollout; it is intentionally
ignored by Git. The deployment regenerates it for the triggering release.
Concurrent release ordering remains a separate release-locking concern.
