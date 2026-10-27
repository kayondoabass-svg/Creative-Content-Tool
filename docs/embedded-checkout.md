# BrightBoard embedded checkout

The existing PostgreSQL payments database remains authoritative. Startup runs
an additive, idempotent migration in `server/payment-checkout-schema.ts` for
checkout attempts and once-only activation records. No customer payment data
belongs in Git, browser storage, or standalone BrightboardTV releases.

## Production setup

- Keep the existing PesaPal consumer key and consumer secret in server secrets.
- Set the existing server `APP_URL` configuration to the canonical HTTPS
  BrightBoard origin. Do not use a request Host header as a callback origin.
- The server registers `/api/pesapal/ipn` using PesaPal's API. The notification
  identifier and tracking identifier are provider-generated, not made-up IDs.
- Build before deploying the prebuilt VPS files. No destructive migration is
  required. Startup must have permission to create the two additive tables.
- At the reverse proxy, preserve the application CSP and SAMEORIGIN headers.
  Do not add conflicting DENY headers or a frame-src policy excluding
  https://pay.pesapal.com. Confirm headers on the live HTML response after release.

## Security boundaries

All HTML responses allow only same-origin framing through CSP frame-ancestors
and X-Frame-Options. Checkout document responses restrict outgoing frames to
the same origin and https://pay.pesapal.com; unrelated pages retain their ad
frame support. Pricing navigates to a fresh same-origin checkout document so
its frame-src header applies. Links leaving checkout also load a fresh document:
an SPA route change alone cannot replace a document's CSP, and login needs its
own reCAPTCHA frame policy. Checkout URLs additionally require HTTPS, the exact host,
no user credentials, and a /pesapaliframe/ path. Only authenticated customers
can read their own order. Checkout creation requires an approved Origin and
rejects cross-site requests; callbacks/IPNs instead verify the provider result.
PesaPal still controls its frame, payment fields, branding and any bank or
mobile-money authorization. These protections reduce clickjacking; they cannot
prevent lookalike websites or all fraud.

## Payment safety

An order and attempt are committed before contacting the provider. An
account-scoped transaction lock prevents concurrent duplicate creation for the
same plan/currency. Reusing an attempt returns the same order. Ambiguous order
creation is never automatically re-submitted: retain the reference for support.
An interrupted initialization becomes visibly unknown after 90 seconds.

Callbacks, notifications and customer status checks use shared authoritative
verification, including reference, tracking ID, amount and currency. Provider
requests happen outside database transactions. Activation locks the payment
and account and records a unique activation; the receipt is queued in the same
transaction. Receipt transport acceptance is not claimed as inbox delivery.
An existing historical activation is not applied a second time. A future
refund preserves referral review and reversal behavior.

## Release verification

Run `tsx --test server/*.test.ts` and `npm run build`. Browser checks should
cover desktop, mobile/PWA, sign-in required, pending, confirmed, unsuccessful,
reversed, untrusted checkout URL, reload/resume and manual status checking.
Use browser response fixtures for presentation checks without taking money.
An actual provider checkout, bank authorization, and live notification delivery
need a separately authorized controlled transaction after production deployment.
