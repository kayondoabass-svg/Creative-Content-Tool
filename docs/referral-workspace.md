# Referral workspace

## Who can see what

- `/affiliate` is the public program page and signed-in applicant workspace.
- Applicants must sign in with the **verified email address on their application**.
  Existing approved applications are matched to that email without deleting,
  reassigning or recreating their records.
- Applicants can access only their own application, link, anonymized referral
  activity, commissions, payout instructions and payout history.
- Founder-only notes and other partners' identities/finances are not returned to
  applicant APIs. Guessing another email or ID does not grant access.
- Founder accounts see all applications in the owner dashboard, with clickable
  profiles, search, status filters and pagination. Founder access is checked
  against the server-side account record on every private request.
- The former public status-by-email endpoint now requires authentication and
  ownership. The public apply endpoint also requires a verified account and
  derives the applicant's email from that account, not the request body.

## Founder setup

Open **Owner dashboard → Referral partner review → Program policy**.
Choose percentage or fixed-by-plan commissions, the currency for fixed rates,
clearing days and payout minimums per currency. Explicitly confirm/save the
policy, with Program active checked, before new payments earn commissions.

The initial policy is deliberately **inactive**. Previous copy advertised both
30% recurring and incompatible flat amounts, so no rule is silently selected.
Rates/thresholds are entered in the app's stored minor units (100 units = 1
currency unit, consistent with the existing payment service).

Only eligible payments initiated after the policy was first activated are
credited. Existing referred users can qualify on new eligible payments; old
payments are not automatically turned into historical debt. Policy snapshots
are saved with each commission so later rate changes do not rewrite earnings.
Reconcile eligible payments creates missing entries without double-crediting.

## Applications and review

Applicants see receipt confirmation and can revisit their private workspace.
The founder receives a queued application alert; the applicant receives a
queued acknowledgment. Founder status decisions queue an applicant email.
Approved applicants can copy their code/link. Rejected applicants may submit
an updated application under the same account; the original code is retained.
Suspension stops new commissions/attribution and new payout requests without
erasing existing statements or earnings.

Founder detail includes the complete application, code/link, referred accounts,
commission records, payouts and review history. Notes entered as founder notes
are private. Status changes and financial actions are audited.

## Referral attribution and commission accounting

- A valid approved referral link sets a signed, HTTP-only, 90-day cookie.
- Last valid referral click wins; invalid/expired/tampered cookies are ignored.
- Attribution survives navigating away and returning, including the supported
  social signup callbacks. Only newly created accounts are attributed.
- Same-email self-referrals are rejected.
- Raw valid link requests are counted, not unique people.
- Verified PesaPal completion updates the payment, inserts its unique founder
  email event and records an eligible commission in one database transaction.
- Commission uniqueness by payment prevents duplicate callback/IPN/recheck
  credit. Pending and failed payments earn nothing.
- Held commissions clear after the configured hold period. Founder review can
  release a hold or reverse an unpaid, unreserved commission with a note.
- Founder reversal is the supported manual adjustment for refunds/disputes.
  A paid payout is immutable through these controls; recoveries after a paid
  commission require separate accounting rather than silently rewriting history.

## Payout workflow

Partners save payout contact/instructions; never passwords or card numbers.
Approved partners may request the full available balance for a configured
currency after meeting that currency's minimum.

Requests reserve the included commission rows transactionally, preventing a
second request from spending the same balance. The founder can reject a request
to release the reservation, or approve it. **Mark paid** requires prior approval
and the reference of a transfer actually made outside BrightBoard.

This release does **not** execute PayPal/bank transfers automatically. Do not
mark a payout paid until the transfer is complete. Currency balances are kept
separate; there is no invented cross-currency exchange rate.

## Notification operations

The notification outbox survives restarts. A worker processes pending messages.
The founder sees attempts/status and can retry failed messages. Timeouts,
interrupted requests and ambiguous provider responses are `unknown`, not
automatically resent: check the recipient inbox and explicitly acknowledge
duplicate-delivery risk before retrying.

`sent` means the email provider accepted the message, not confirmed inbox
delivery. Raw provider response bodies and API keys are never stored in delivery
history. Credentials stay in server environment variables.

## Deploying safely

The production build includes additive, idempotent schema setup at startup:
new referral tables are created if absent; existing user, affiliate and payment
tables are never dropped, truncated or recreated. Normal operation updates only
records targeted by authorized user actions.

The external VPS must receive the updated source **and tracked dist build**,
then restart BrightBoard. An unsuccessful GitHub SSH workflow is separate from
manual deployment; configure its existing VPS credentials if automatic rollout
is desired. No authentication or email keys need rotating for this feature.

## Verification

- Unit checks cover ownership, draft-policy safety, percentage/fixed arithmetic,
  signed attribution, safe CSV, queued payment alerts and delivery ambiguity.
- `tsx scripts/test-referral-workspace.ts` runs real PostgreSQL/HTTP lifecycle
  checks inside an empty temporary schema. It does not use existing customer
  records, contact the mail provider, or charge a payment.
- Browser verification uses uniquely marked development-only fixtures and
  temporary signed sessions, never a shipped authentication bypass.
