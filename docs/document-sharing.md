# BrightBoard document sharing

Hosted sharing is separate from the free independent software and from 24-hour
recent generation history. Publishing uploads an intentional complete snapshot
to the existing PostgreSQL database. Copies remain until their owner deletes them
or their account is removed. Disabling or expiring a link restricts access but
does not delete the owner's stored copies.

## Access and revisions

- All recipients must sign in and verify their email.
- Invitations match the verified account email, including accounts registered
  after an invitation was created. The owner sends the copied BrightBoard link;
  invitations do not automatically send email.
- Invited-only is the default audience. Link access allows any verified,
  signed-in holder to view, not edit.
- Requests are reviewed in Shared documents. Pending counts appear in the
  signed-in header. Approval grants editing; collaborators cannot administer the
  owner's invitations, sharing settings or deletion.
- Stable `/share/<id>` URLs follow the latest published revision. Pinned
  `?revision=<uuid>` links and their QR codes identify an immutable revision.
- Updates require `If-Match` with the last observed revision. Conflicts return
  409 without changing either snapshot. Publishing is explicit, not per keypress.
- Removing an invitation removes its special privileges. If link access remains
  enabled, the account can still view like any other signed-in link holder.
- Revocation cannot erase previously downloaded copies, screenshots, browser
  caches outside application control or a request already in progress.

## Privacy and formats

Known structured private-note and answer-key fields are removed by default.
Owners must still review the complete source: names, student details and answers
inside prose or images cannot be reliably inferred or automatically removed.
Changing private-content inclusion requires publishing a new document from the
original source; removed fields cannot be recovered from a sanitized snapshot.

Each snapshot includes editable source where the tool supports it. Binary
documents support preview where safe and replacement revisions rather than
pretending arbitrary PDF/Office files are natively editable. Read-only controls
are not digital-rights management: the browser necessarily receives preview data.

The server never fetches document-supplied URLs. The client embeds image assets
before publication; embedding failure is an error rather than a broken share.
Remote 3D assets must already be included in supported lesson data. Executable,
HTML, SVG upload and environment files are excluded. No external QR service is
used. Account logos/settings are not silently attached to documents.

## Free launch safety limits

- 100 owned shared documents per account.
- 16 MB uncompressed per snapshot, including embedded assets.
- 128 MB per owner across all retained revisions.
- 50 retained revisions per document; save a separate document to continue.
- 100 invitations per document, bounded request sizes and rate limiting.

No shared-document expiry silently deletes source data. Deletion requires owner
confirmation; keep a downloaded backup before deleting.

## Deployment and verification

New sharing uses a dedicated Cloudflare Worker with **private R2 snapshots** and
**D1 metadata, permissions, invitations, requests, versions and deletion jobs**.
Existing accounts, authentication, TV lesson storage and the TV relay are not
migrated or replaced. No browser or standalone ZIP receives Cloudflare credentials.

The API server signs storage requests with a purpose-separated Ed25519 key derived
from its existing `SESSION_SECRET`. The Worker stores only its public verification
key. Requests expire after 60 seconds; mutation nonces prevent replay. Every
mutation rechecks permission in an atomic D1 batch. Quota triggers and revision
guards prevent concurrent writes from exceeding limits or overwriting newer work.
R2 snapshots carry integrity hashes; failed metadata writes remove uploaded copies.

R2 has no public r2.dev URL or public custom domain enabled. The Worker's service
address is not a document link: unsigned requests cannot read files, metadata or
run SQL. BrightBoard retains all recipient authentication and permission checks.
No S3 credentials are required because the Worker uses private bindings.

Preview and production use different Workers, D1 databases and buckets.
`SHARING_STORAGE_URL` is the environment override; otherwise the server reads
`sharing-storage.config.json`, an ignored, non-secret file installed on the VPS.
Production refuses a preview environment override or preview configuration.
Missing configuration is an explicit 503, not a silent PostgreSQL fallback.

### VPS setup

1. Fetch/reset to the built release, preserving `.env` and the existing PM2 setup.
2. Supply `CLOUDFLARE_ACCOUNT_ID` and the setup-only `CLOUDFLARE_API_TOKEN` securely
   to the deployment process. Do not commit these or print token values.
3. From the project root, run:

   ```sh
   node --env-file=.env dist/sharing-deploy.mjs --production --save-config
   ```

   This standalone bundled script needs no new npm install. It checks for old
   PostgreSQL shared documents before switching: if any exist, it stops instead
   of stranding their links. They require a separately verified, link-preserving
   migration, not deletion or an automatic conversion. Old tables are untouched.
   It creates only `brightboard-sharing` resources, applies the D1 schema
   idempotently, deploys the private service with this VPS's public key and verifies
   a signed D1/R2 health check before atomically saving the non-secret config.
4. Restart the existing `brightboard` PM2 process without `--update-env`.

Do not deploy a production service from the Replit preview environment: its session
secret may differ from the VPS. A mismatched existing public key aborts deployment.
After a deliberate `SESSION_SECRET` rotation, redeploy from the same VPS with
`--rotate-key`; do not use that flag to bypass an unexplained server mismatch.

The setup token is not a runtime credential and can be removed from the terminal
environment after deployment. Its expiry does not stop normal sharing. As with all
cloud storage, Cloudflare's account limits and billing still apply even while
BrightBoard sharing is free.

Owner deletion removes metadata access immediately and queues private R2 deletion.
Account deletion first removes its shared documents, invitations and requests
through the service. A scheduled cleanup drains deletion jobs and scans for
unreferenced crash uploads older than 24 hours using a persistent pagination cursor.
This grace period is not a retention limit for legitimate published documents.
Publishing a GitHub commit does not deploy or configure the external VPS.

Run `npx tsx --test server/document-sharing.test.ts` for isolated-schema tests.
These retain legacy-store validation coverage. For the Cloudflare adapter:

```sh
RUN_CLOUDFLARE_SHARING_TESTS=1 npx tsx --test server/cloudflare-sharing.test.ts
```

Live tests refuse production endpoints, create synthetic isolated identities, and
clean their metadata and R2 snapshots afterward. They cover real private D1/R2
round trips, signatures, request approval, role checks, immutable versions,
concurrent updates, expiry, revocation, replay and deletion.
For browser tests only, `npx tsx scripts/sharing-ui-fixtures.ts` creates synthetic
development users and private, short-lived session fixtures in `/tmp`; use the
same command with `--cleanup` afterward. Never run fixtures against production.
