---
name: Afro Auth API contract
description: Resolving differences between Afro Auth's project dashboard and public documentation during API upgrades.
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
