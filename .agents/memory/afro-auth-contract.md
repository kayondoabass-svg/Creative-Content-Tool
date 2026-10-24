---
name: Afro Auth API contract
description: Afro Auth project contract, exact browser origins, and the difference between ownership and mailbox confirmation.
---

Afro Auth's project dashboard publishes canonical versioned tenant endpoints,
while its public documentation can still show legacy unversioned examples.
Use the project dashboard's connection examples alongside the documentation,
rather than treating one older documentation example as the complete contract.

**Why:** During the October 2026 upgrade, the project connection UI showed
`/cf-auth/v1/t/:slug`, while public docs showed `/cf-auth/t/:slug`. Both sources
also specify that signup sends confirmation links and does not authenticate
the customer. A browser's verified website domain is not customer email proof.

**How to apply:** Recheck the provider's current project connection examples
when upgrading its API. Do not invent a public-key header: the documented
direct signup/login REST examples use JSON without one; the secret is used
only by the server-side session verification endpoint.

## Exact production browser origins

Keep both `https://brightboardapp.com` and `https://www.brightboardapp.com`
explicitly allowed when both hostname forms are in use. Website ownership
verification does not automatically allow either browser origin.

**Why:** The provider's public confirmation endpoint accepted the `www`
origin but rejected the bare-domain origin during a real confirmation
investigation. The two origins are not interchangeable.

**How to apply:** Recheck the provider project settings when changing auth or
production hostnames. Preserve legitimate exact origins; do not add Gmail,
wildcards, or unrelated provider origins as a workaround. A successful
anonymous endpoint check is not proof that a real confirmation form was
submitted or that login works.
