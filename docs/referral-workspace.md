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
- Held commissions clear only after the configured hold period **and** a successful
  provider check within five minutes. This includes zero-day holds. Partners and
  the founder can use **Check provider payments**; reading a statement never
  contacts PesaPal or silently clears an unverified commission.
- Payout requests, approvals, mark-paid and founder releases verify payment
  status server-to-server. A failed check is committed as a safety hold even if
  the requested financial action is refused. The provider lookup has timeouts;
  a sweep has a bounded network budget and leaves unchecked rows under review.
- Unknown/error, failed or reversed responses put unpaid commissions under
  `review`. They are not automatically restored by a later completion or timer.
  Founder **Resolve and release** requires a fresh completed result and an explicit
  resolution note. **Reverse** remains an audited action for fully ineligible,
  unpaid, unreserved commissions.
- Affected requested/approved payouts become `blocked`, retaining their original
  amount, members and history. They cannot be approved or marked paid. Reject
  the blocked request to release its reservations, then request a new payout
  using only unaffected earnings. There is no silent resizing or cross-currency
  offset. An immutable payout-item ledger preserves original membership and
  amounts after rejection/rescheduling. Setup backfills existing reservations;
  it cannot reconstruct memberships of requests rejected before this feature.
- Paid payouts and commission amounts/statuses are never rewritten by refund
  reconciliation. A unique, separate recovery-review ledger entry records the
  maximum exposed commission, not an established debt. The founder records
  money **already recovered separately**, with the actual reference and private
  evidence, or closes the review without recovery. A partial recovery closes
  remaining exposure without deduction. No unrelated or future earnings are
  reduced. Duplicate notifications cannot create another recovery.
- Provider notifications are hints only: callback/IPN/founder recheck retrieves
  status directly from PesaPal. Delayed completed notifications cannot undo a
  known reversal. Financial writes share a transaction lock to serialize
  notification handling, reservations and founder decisions.

### Verified PesaPal contract and limits

Checked against official API 3 documentation on 2026-10-26:

- [GetTransactionStatus](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/gettransactionstatus):
  `status_code` is 0 INVALID, 1 COMPLETED, 2 FAILED, 3 REVERSED. The sample's
  `payment_status_code` is empty and must not be substituted for `status_code`.
  `status: "200"` indicates a successful lookup, **not** a successful payment.
  Contradictory/missing status, API errors and mismatched merchant reference
  fail closed; completed checks also match original amount and currency.
- [RefundRequest](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/refund-request):
  acceptance means a refund is being processed, not effected. Cards support
  partial/full refunds; mobile payments only full refunds. No refund requests
  or charges are issued by this workspace.
- The documented status lookup supplies no refunded amount and no separate
  dispute/chargeback status. Do not invent these fields or infer full refund
  from REVERSED. Conservatively flag the commission for founder review.
  Use **Flag refund/dispute** with an external provider evidence reference in the
  required internal review note for partial refunds or disputes known through
  the merchant portal/support. This flags unpaid commissions or opens a paid
  recovery review; it does not claim an undocumented automated dispute feed.
- Partners see only their own review/status/recovery statement entries, with
  no provider evidence references, private resolution notes or customer identity.

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

### Owner-confirmed payout scope

The owner chose to **keep payouts manual** after reviewing provider options.
Use PesaPal only; the business and intended recipients are in Uganda, with USD
requested for partner payouts. This request does not confirm that PesaPal
supports USD disbursements for this merchant, and does not change existing
currency balances or commission policy.

PesaPal publicly offers disbursements in Uganda through
[Openfloat](https://www.pesapal.com/blog/pesapal-uganda-launches-openfloat-transforming-bulk-funds-disbursement-for-businesses).
Before any future automated integration, obtain the merchant-specific API
documentation and confirmation of USD support, fees, onboarding/compliance,
idempotency, status verification and webhook authentication. Checkout payment
acceptance or settlement to the merchant is not evidence of a completed partner
payout. No automatic transfer, onboarding or webhook integration is enabled.

The owner also requested removal of the unused Stripe connection. No Stripe
payout code was added. Disconnecting the workspace connection is a separate
owner action in **Integrations → Stripe → Manage → Disconnect/Remove**;
documentation changes do not disconnect it.

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
  It stubs all provider HTTP requests and covers refund checks at approval and
  mark-paid, delayed/duplicate notifications, blocked reservation release and
  rescheduling, immutable paid entries, capped separate recovery, duplicate
  recovery rejection, outages, mismatched references, explicit review release,
  external dispute flags, restart-safe schema setup and partner privacy.
- Browser verification uses uniquely marked development-only fixtures and
  temporary signed sessions, never a shipped authentication bypass.
