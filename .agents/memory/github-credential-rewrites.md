---
name: GitHub credential rewrites
description: Workspace Git authentication can come from inherited URL rewrites, not just the local origin.
---

A clean saved origin does not prove Git's effective URL is credential-free. This workspace has had inherited GitHub URL rewrite rules that insert authentication.

**Why:** Checking the effective remote after sanitizing the local setting still found URL userinfo. Shared authentication rules can exist outside the project's tracked configuration.

**How to apply:** Capture checks without printing URL contents or rewrite keys, which may themselves contain credentials. Keep credential-free overrides scoped to the push invocation rather than removing shared authentication settings. Test inherited rewrite behavior using synthetic credentials and a local remote; do not push to GitHub merely to verify authentication changes.
