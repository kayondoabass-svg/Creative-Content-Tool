---
name: Release verification policy
description: Distinguish origin identity checks, public verification, and protected probes without weakening Cloudflare.
---

A successful build or PM2 restart is not evidence that customers received the
release. Keep origin identity and public delivery as separate outcomes; blocked
public checks must not be described as successful public rollout.

**Why:** The external VPS release process previously reported success without
confirming which build was running. Cloudflare can legitimately prevent automated
public probes even when an authenticated origin check succeeds.

**How to apply:** Preserve Cloudflare protection and the existing VPS/PM2
environment. Use read-only origin checks over trusted SSH, and report public
protection blocks explicitly. Set deployment credentials in GitHub Actions'
secure settings, never chat or source; workspace secrets are a different store.
