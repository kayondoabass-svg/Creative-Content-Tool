---
name: Cloudflare storage authorization
description: Distinguish valid tokens from account-scoped storage permissions when configuring BrightBoard sharing.
---

A successful Cloudflare token-verification response does not establish access to D1, R2 or Workers.

**Why:** Token verification accepted an active credential while the specific account's storage and Workers endpoints rejected it. Account discovery may also be denied even when token verification succeeds.

**How to apply:** Confirm the intended Cloudflare Account ID and account-resource restrictions, then check the actual required service endpoints. Do not infer access from token status alone or repeatedly reconnect a management connection whose requested scopes exclude storage.
