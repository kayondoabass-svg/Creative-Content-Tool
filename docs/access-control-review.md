# Access-control release review

## Fixed
- Retired emergency-delete/reset HTTP routes always return 410. No source-code
  recovery key or environment-key bypass can reset/delete the founder.
  Normal verified password recovery remains available.
- Generation jobs require a signed-in creator; other users receive 404 even
  when they know the job ID. Ownership is not returned in polling responses.
- Model diagnostics require the existing server-side founder check.
- API request logs retain method/path/status/duration, not response bodies.
  Email delivery logs no longer print recipients or provider response/error objects.
- Verification forms no longer persist email addresses in local storage;
  legacy stored addresses are removed.
- Flashcard filesystem reads and public serving are restricted to the approved
  built-in catalog. These illustrations are intentionally public teaching assets,
  not private customer uploads. AI-generated flashcard images are returned inline
  to authenticated callers and are not written into that catalog.
- Security dependency updates include Zod 4, compatible form/schema adapters,
  PDF.js 6 legacy browser entry/worker, Sharp, Vite and transitive fixes.
  Removed unused Resend SDK (email transport already uses AfroAI) and obsolete
  pnpm lockfile; npm lockfiles remain authoritative.

## Preserved
- Sharing uses authenticated BrightBoard routes, private Cloudflare R2 snapshots
  and D1 permissions. Invited/approved users retain the access granted by owners.
- Stable links, revision links, QR codes, editing approvals, revocation,
  disabled/expired links and concurrent-save checks remain intact.
- Existing account database and BrightboardTV relay, pairing and lesson-storage
  architecture are unchanged. TV dependency manifests/build outputs are updated;
  its relay and editor implementation are not replaced.
- Public offline packages contain no environment files or private server imports.

## Verification and limits
The regression suite exercises real preview D1/R2 and synthetic test identities.
It also covers account-private libraries, logos, API keys and existing TV relay
behavior. No founder account recovery/reset/delete was executed.

Production deployment requires Node >=22.13 and installing the updated npm
lockfile before restarting PM2. A GitHub push alone does not activate the VPS.
Do not print secrets, modify .env, or restart PM2 with --update-env.

Static scanner warnings about the operator-authorized live-test bcrypt hash and
the HMAC-signed referral attribution cookie are not authentication bypasses:
the former hashes an operator-entered temporary password; the latter is not a
session cookie and its input is allowlisted and authenticated. These warnings
must be triaged against the current source, not suppressed by weakening checks.

This review does not establish the VPS firewall/database network exposure or
erase sensitive records written to historical logs. Restrict historical log
access and handle retention separately; do not delete operational logs blindly.
