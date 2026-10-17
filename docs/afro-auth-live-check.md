# Real Afro Auth acceptance check

## Status and evidence rules

**NOT YET VERIFIED against real inboxes / the rotated VPS key.** Unit tests and
the earlier mocked browser pass are not delivery evidence. This document is a
runbook, not a passing acceptance report. A preflight is configuration validation
only. Do not tell customers real confirmation/recovery works until the whole
live check passes.

The terminal runner exercises BrightBoard's actual API and the actual provider;
it does not intercept requests or fabricate messages. The operator opens and
submits real provider-hosted email forms in a private browser. A generic recovery
acknowledgement alone is never a pass. The check requires a successful subsequent
login, old-password rejection at **both** BrightBoard and Afro Auth, and rejection
of two pre-reset BrightBoard sessions.

## Prerequisites (operator authorization required)

- Two **dedicated, disposable, explicitly authorized** inbox addresses/aliases:
  a fresh signup address and a fresh legacy-fixture address. Never customer
  credentials, customer mailboxes, or the owner's normal account.
- Access to those inboxes and the project's Afro Auth session management UI.
  Authorize sending mail, creating the two free test profiles, changing their
  passwords, and revoking **only their** sessions. The runner cannot establish
  mailbox ownership from an environment variable; a responsible operator must
  grant this authorization.
- The rotated server key in the actual runtime and the correct project slug.
  Both the target app and runner must use the same project and key. The check
  deliberately does not accept the older compatibility-key name as evidence.
  An environment-presence preflight cannot prove the app uses the new key.
- Run fixture creation on the machine connected to the **target app's database**.
  Never point a locally seeded fixture at an unrelated external app.
- Review the current **project dashboard's connection examples**, not just the
  public guide. Confirm `/cf-auth/v1/t/:slug` and the server-only
  `/cf-auth/v1/sessions/verify` match the adapter. Do not copy any keys into this
  document or the terminal command line. If examples differ, stop and reconcile
  the contract before running.
- Use a private terminal/browser with screen sharing, shell tracing (`set -x`),
  terminal recording, browser network capture, HAR, video and screenshots off.
  Do not run through an agent shell that records input. Never paste passwords,
  recovery codes, cookies, tokens, or mail links in chat.

The public guide at `https://afroaigroup.com/docs/auth`, consulted 2026-10-16,
currently documents the unversioned tenant alias, 12–128 character new/reset
passwords, POST-required hosted confirmation/reset forms, reset revoking existing
sessions, and the versioned server verifier. It explicitly warns documentation
does not prove rollout. The authenticated project's current examples still need
operator review; the runner gates execution on a recent review date.

## Secure runtime configuration

Use an existing protected runtime secret store or a private `.env` file outside
Git (mode `0600`). Merge settings; do not replace the app's existing database or
session configuration. Never commit a populated file. `.env`/`.env.*` are ignored.

Required variable **names** (no real values here):

| Name | Meaning |
| --- | --- |
| `AFRO_AUTH_SECRET_KEY` | Rotated project's server-only key |
| `AFRO_AUTH_PROJECT_SLUG` | Exact tenant from current connection examples |
| `AUTH_LIVE_TEST_BASE_URL` | Target app origin; HTTPS, or HTTP loopback on the target server |
| `AUTH_LIVE_TEST_EMAIL` | Authorized fresh signup inbox |
| `AUTH_LIVE_TEST_LEGACY_EMAIL` | Authorized fresh legacy-fixture inbox |
| `AUTH_LIVE_TEST_AUTHORIZED` | Set to `dedicated-test-accounts-only` only after explicit authorization |
| `AUTH_LIVE_TEST_CONTRACT_REVIEWED_ON` | Date (`YYYY-MM-DD`, within seven days) examples were actually reviewed |
| `DATABASE_URL` | Existing target database; fixture creation only |

Keep inbox addresses in runtime configuration, not reports. Passwords and legacy
codes are entered at hidden local prompts; neither mail links nor provider tokens
are requested as input. Tokens/cookies stay only in process memory.

## Commands

Use the existing installed dependencies. On Node 20.19+ with a private `.env`
already in the current app directory:

```sh
# No network, database changes, or emails. NOT a live pass.
node --env-file=.env --import tsx scripts/auth-live-check.ts --preflight

# Create exactly one new LOCAL-ONLY free fixture; refuses existing email rows.
# Does not register with Afro Auth, send mail, or overwrite any profile.
node --env-file=.env --import tsx scripts/auth-live-check.ts --seed-legacy

# Real operator-assisted check. No credentials in command arguments.
node --env-file=.env --import tsx scripts/auth-live-check.ts
```

If the variables are already injected securely, use `npm run auth:check:live`
(and append `-- --preflight` or `-- --seed-legacy` as needed).
Do not run the fixture step with credentials obtained from a customer.
It creates a normal free profile; no schema migration or auth test backdoor.

The runner:

1. Verifies anonymous protected access is denied; creates a new signup and checks
   `/auth/me`, protected content and unconfirmed login all deny a session.
2. Pauses for the **real inbox link and hosted form submission**, checks no
   automatic app session was created, then signs in and accesses protected data.
3. Pauses for provider-side revocation of only the signup account; replays its
   app cookie and requires denial. Signs in again, logs out, replays the former
   cookie and requires denial.
4. Creates two app sessions, requests a real reset email and pauses for real
   hosted reset submission with the chosen new password. Both old sessions and
   the old password must fail. The new password must sign in successfully.
5. Checks the provider itself rejects the old password and issues a real,
   server-verified session for the new password; provider logout must invalidate
   that token. This separate adapter check does **not** claim to inspect the
   app's hidden provider token during app logout.
6. Deliberately waits out the remaining 15-minute BrightBoard rate-limit window
   before legacy recovery. Production rate limits are not disabled. A 429 stops
   the run, rather than triggering retries.
7. Requests a real legacy recovery code for the already-provider-backed signup
   test account and proves it cannot overwrite the provider password or restore
   the old password.
8. Requests the legacy fixture's real recovery email, privately accepts its
   code, rejects an invalid code, provisions Afro Auth without a session, rejects code reuse, requires
   the new real provider confirmation link, then verifies login/protected access
   and logout.

Expect at least 15 minutes, plus inbox arrival/form interaction time. Do not
send repeated requests on a delivery delay. Each prompt expires after ten minutes.
At hidden prompts, Ctrl-C stops and performs best-effort session logout.

## Safe failure checks (separate mocked evidence)

`npm run auth:check:unit` covers missing/invalid configuration, HTTP/non-JSON
provider failures, timeouts, wrong identity, unconfirmed login, unavailable
verification retaining the local session but blocking protected work, revoked
sessions, and runner redaction/redirect/rate-limit safety. These are deliberately
mocked: do not simulate provider downtime by rotating a production key or taking
down customer authentication. Passing these tests is not real delivery evidence.
`npm run auth:check:types` checks the transport, configuration, terminal input and
scenario independently of the existing app-wide type-check failures. Fixture
database imports currently encounter the existing `server/db.ts` Pool/Drizzle
type mismatch; this focused check does not claim to validate that module.

Never print caught raw HTTP/SQL errors, response bodies, headers, environment
contents or inbox pages while diagnosing a failed live run. The runner reports
fixed step messages and exits nonzero. A failure after signup may leave an
unconfirmed provider account; inspect/remove **only the test account**, or use
fresh authorized aliases after cleanup. No blanket deletion or automatic reset.

Use a target build containing the authentication-log redaction changes: API
request logs omit auth response bodies, relevant auth failures suppress raw
exceptions, and outbound email errors omit provider response bodies that could
echo codes/links. Do not enable additional reverse-proxy request-body logging.

## Evidence and cleanup

Record only: UTC date, operator authorization confirmed (yes/no), target
environment label (not credentials), contract examples reviewed (date), step
names and PASS/FAIL/BLOCKED. An incomplete run stays **NOT VERIFIED**. No inbox
address, password, code, link, cookie, token, raw response, or screenshot belongs
in the report. A source revision may be noted privately, but is not proof that
the external VPS actually runs that code or key.

The runner attempts logout of its remaining sessions on success/failure. This
does not guarantee remote cleanup during a provider outage. The authorized
operator must revoke any remaining **test** sessions, remove only the two test
accounts from the provider and BrightBoard using the normal owner tools, and
delete test messages/recordings if any were accidentally made. The runner never
deletes accounts or changes customer data automatically. Unset the authorization
flag after testing. Do not reuse the discarded test passwords.
