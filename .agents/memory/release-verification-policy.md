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

BrightboardTV must distinguish the running build, the build deployed on its own
server, and the latest downloadable GitHub release. Updates remain explicit and
must preserve the editor's unsaved-work protection.

**Why:** Correct public release downloads coexisted with an older hosted editor.
Refreshing a browser cannot install code that its server has not deployed, and
one package version can identify multiple development/hosted builds.

**How to apply:** Show both package version and independent source build identity.
Do not expose private repository history through standalone metadata. A version
check must not reload, activate a waiting worker, or clear lesson storage. Before
an explicit reload, save and recheck any edits made during update preparation.
