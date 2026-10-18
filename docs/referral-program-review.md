# Referral program review and recommended plan

> This is the original pre-implementation audit. The new private applicant and
> founder workspace, commission accounting, payout recording and notification
> queue are documented in [Referral workspace](referral-workspace.md).

## Scope

This is a code-based review of the founder dashboard, public affiliate page,
signup attribution and payment processing. It does not certify historical
commissions, actual payout balances, or inbox delivery. No production customer
or payment data was changed for this review.

## Founder alerts added

- A dedicated successful-payment email is sent to the founder when a
  provider-confirmed PesaPal payment first transitions to completed.
  The shared status updater covers browser callbacks, IPNs and owner rechecks.
- Details: customer name/email when available, original amount/currency, plan,
  order ID, payment method, confirmation code and UTC confirmation time.
- A dedicated referral-application email replaces the generic partnership/contact
  email after a new application is saved, with applicant details and a link to
  the founder dashboard.
- Destination is server controlled, defaulting to the existing founder mailbox;
  optional `OWNER_NOTIFICATION_EMAIL` can override it.
- Applicant-controlled text is HTML escaped. Both emails include plain text.
- Duplicate payment completion callbacks do not create duplicate founder alerts;
  pending/failed payments do not send successful-payment alerts. Late failures
  do not downgrade a completed payment.
- Email failures are logged and do not undo payment/application records.

### Current delivery limitation

Alerts are sent inline using the existing AfroAI service. There is not yet a
durable notification queue, delivery history, or retry/resend interface.
If the process exits between saving an event and sending its email, or AfroAI
rejects an alert, that alert may not be delivered. Retrying all completed
callbacks indiscriminately would create duplicates, so it is not used.
Do not describe acceptance as confirmed inbox delivery.

## What already works

### Applicant side

- Public program information and application form with required name, email and
  reason, plus website/social/audience details.
- Duplicate-email application checks.
- Pending, approved and rejected status displays.
- Approved referral code/link with copy buttons; summary referrals and earnings.
- Approval/rejection emails, including rejection reason.

### Founder dashboard

- Owner-restricted list of applications.
- Pending, approved and rejected groups and counts.
- Review submitted application details; approve or reject with a reason.
- Approved partner code, referral count and earnings total.

### Attribution

- Signup reads a `ref` query parameter and sends it to the signup endpoint.
- An approved code can be stored on a newly created user, with the partner's
  signup counter incremented.

## Missing or inconsistent behavior

### Critical: financial promises are not implemented

The public English copy promises 30% recurring commission, but also lists flat
rates of $1/week, $2/month and $5/month for institution referrals. Those are
different rules. There is no payment-to-commission ledger or earnings update in
the current successful-payment flow.

Monthly payments on the 15th, a $50 minimum, and PayPal/bank transfer are
advertised, but there is no payout request/approval/recording workflow or payment
method collection behind them. An aggregate `totalEarnings` field is not a
financial ledger and cannot establish earned, payable or paid balances.

### Critical: applicant privacy

`GET /api/affiliates/status/:email` is public and returns status, link/code,
referral count, earnings, dates and rejection reasons to anyone who knows an
email address. Reapplying with an approved email can also return that person's
code. The partner area must require an authenticated account or proof of email
ownership. Avoid exposing financial details in public URLs and access logs.

### Referral tracking

- No implemented 90-day referral cookie despite the advertised promise.
- Referral identity is read only from the immediate email-signup URL; navigating
  away can lose it.
- Social signup does not carry this referral path through its OAuth flow.
- No click/conversion analytics, first/last-touch rule, self-referral protection,
  or fraud review.
- No payment-by-payment connection between a referred user and their partner.
- No refund/dispute/cancellation handling for commissions.
- No defined historical backfill policy.

### Founder dashboard

- No search, filtering by date, pagination, decision history or internal notes.
- No suspend/reactivate/review-again controls.
- No commission breakdown, pending/cleared/reversed/paid balances or due payouts.
- No payout approval, payment reference, export or audit trail.
- No email delivery status/resend controls.

### Applicant side

- No secure personal partner dashboard or account linking.
- No received-application acknowledgment email.
- No referral/conversion history or commission statements.
- No payout details, payout request/status/history or balance breakdown.
- No rejection/reapplication process.
- No explicit acceptance of partner terms and commission policy.

## Recommended implementation order

1. **Set the financial rules and protect partner information.**
   Agree percentage versus flat rate, qualifying plans, renewals, commission
   duration, clearing/hold period, currencies/FX handling, refunds and payout
   terms. Keep terms consistent across the site and emails. Secure applicant
   status and approved-code lookup with account/email ownership; add validation,
   abuse controls and partner account linking.
2. **Make referral attribution and earnings accurate.**
   Implement the chosen attribution window (90 days if retaining the current
   promise), carry it through email and social signup, block self-referrals,
   and record eligible commissions from verified payments. Use unique
   payment/partner ledger entries so repeated callbacks cannot double-credit.
   Track refunds/reversals and hold versus payable amounts. Define how to
   reconcile existing referred users/payments without inventing historical debt.
3. **Finish the founder dashboard and applicant workspace together.**
   Founder: review/search/filter, notes and decision history, suspend/reactivate,
   partner performance, balances, payout queue, statement export and audit trail.
   Applicant: secure application/status area, acknowledgment and decision emails,
   copyable link, conversions, itemized commissions, available/held/paid totals,
   supported payout details and payout history. Never expose referred customers'
   personal information unnecessarily.
4. **Add reliable notification and payout operations.**
   Durable email queue with delivery attempts and controlled resend; payout
   request/approval/recording and payment-reference workflow. Mark paid only
   after the transfer is actually made/confirmed. Do not imply PayPal/bank
   payments are automated until a payout provider is integrated.
5. **Verify the complete lifecycle before promoting it.**
   Test apply -> founder alert -> approve -> applicant email -> referral signup
   -> confirmed payment -> single commission -> hold/clear -> payout recording.
   Include rejection, duplicate callbacks, social signup, missing/invalid codes,
   expired attribution, self-referral, refund, notification failure and access
   checks between different partners.

## Deployment / verification

No database migration is required for the founder-alert changes. The normal
production build includes them. The external VPS must receive the updated
tracked build and restart its BrightBoard process; a workspace restart alone
does not update the public VPS.

Tests stub email and database operations; they do not charge a card, create a
real applicant, or prove inbox delivery. The new alert subjects are:

- `[BrightBoard] Successful payment`
- `[BrightBoard] New referral program application`
