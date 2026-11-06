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

Application startup creates sharing tables and indexes idempotently using the
existing database connection. There is no new secret, storage provider or manual
schema reset. The VPS must fetch the built release and restart its existing
process; publishing a GitHub commit alone does not update that server.

Run `npx tsx --test server/document-sharing.test.ts` for isolated-schema tests.
For browser tests only, `npx tsx scripts/sharing-ui-fixtures.ts` creates synthetic
development users and private, short-lived session fixtures in `/tmp`; use the
same command with `--cleanup` afterward. Never run fixtures against production.
