---
name: Cloudflare storage authorization
description: Distinguish valid tokens from account-scoped storage permissions when configuring BrightBoard sharing.
---

A successful Cloudflare token-verification response does not establish access to D1, R2 or Workers.

**Why:** Token verification accepted an active credential while storage and Workers endpoints rejected it. The token had correct Edit permissions but a future activation date; verification still called it active. Account discovery was also denied.

**How to apply:** Inspect the verification response's `not_before` and `expires_on` against current time before assuming a permission problem. Confirm the intended Cloudflare Account ID and account-resource restrictions, then check the actual required service endpoints. Do not infer access from token status alone or repeatedly reconnect a management connection whose requested scopes exclude storage.
