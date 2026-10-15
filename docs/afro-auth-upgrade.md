# Afro Auth connection

BrightBoard uses the canonical `/cf-auth/v1/t/:slug` REST endpoints. Signup sends
an email confirmation link and does **not** create a signed-in BrightBoard
session. Users confirm on Afro Auth, then return to BrightBoard to sign in.
Confirmation resend and password recovery use Afro Auth's email links, not
BrightBoard's old six-digit-code mail.

## Server environment

Merge the following settings into the VPS's existing `.env`; **do not replace
the entire file** or remove database, session, payment, or Google credentials.
Use the values downloaded from the correct Afro Auth project's dashboard:

```dotenv
AFRO_AUTH_PROJECT_SLUG=brighboardapp-gj40q9
AFRO_AUTH_PUBLIC_KEY=YOUR_PROJECT_PUBLIC_KEY
AFRO_AUTH_SECRET_KEY=YOUR_NEW_SERVER_SECRET
```

These are placeholders, not usable keys. Never commit the populated `.env`,
put the secret in a frontend/VITE variable, or share keys in chat/screenshots.
The REST signup/login examples do not require a public-key header; the public
key can remain in server configuration for compatibility with Afro's downloaded
settings. Do not invent an API-key header for these public endpoints.

For compatibility, `AFROAI_AUTH_API_SECRET` still works when
`AFRO_AUTH_SECRET_KEY` is absent. If both exist, `AFRO_AUTH_SECRET_KEY` wins.
Keep old keys active until the new configuration is verified; then explicitly
revoke the old key in Afro Auth.

The production PM2 configuration loads `.env` through Node's `--env-file`.
After updating settings and installing the GitHub update, use
`pm2 restart brightboard` (without `--update-env`).

## Account and session behavior

- Existing BrightBoard profiles, subscriptions, Google/social sign-in, and
  databases are not migrated or deleted. No schema change is required.
- Legacy local-only accounts can be registered with Afro Auth on login after
  their existing password is checked. This sends a confirmation link; it is
  not an authenticated login. If the Afro account already exists, a local
  password cannot bypass an Afro rejection. Use Afro's recovery link instead.
- If an older local-only customer has forgotten their password, the recovery
  screen offers an email-code option. After that email proof succeeds, the
  account is provisioned with Afro Auth and must complete Afro's confirmation
  link. Existing Afro accounts cannot be overwritten through this option.
- Login tokens are verified server-side using the server secret and matched
  to the local profile's email before signing in. Session IDs are regenerated.
- Provider-linked sessions are checked before API operations, not just `/me`.
  Invalid/revoked sessions are cleared. An unavailable provider blocks the
  operation with a retryable error without deleting the session.
- Existing local/social sessions without an Afro token remain valid.
- Logout attempts to revoke the provider session and always clears the local
  session. If the provider is unavailable, remote revocation cannot be
  guaranteed until the provider recovers or that token expires.

## Verification

Run `npx tsx --test server/afroaiAuthService.test.ts`.
Mocks cover the provider contract and session guard, not actual email delivery.
A real end-to-end confirmation/recovery test needs the new server secret in
the running environment and access to a test user's inbox. Never use a real
customer's password or mailbox for testing.
