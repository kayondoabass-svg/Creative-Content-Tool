---
name: BrightboardTV file storage
description: Hosted Cloudflare files, standalone local-file permissions, and large-lesson recovery safeguards.
---

The user requested Cloudflare file storage for the hosted application and direct local storage access for standalone.

**Why:** Large imported presentations repeatedly exceeded browser localStorage capacity and prevented opening the stage, even after following the suggested saving procedure.

**How to apply:** Use private Cloudflare storage for hosted presentation files, without moving the existing account database or exposing other customers' files. Keep standalone independent of cloud credentials. Browser access to actual local files must require explicit permission; unsupported devices need visible import/export fallbacks. Durable browser drafts need a large-object store, migration must commit before old copies are removed, and a save indicator must report persistence success rather than network availability.

The approved hosted BrightboardTV page-limit plan is 20 pages for free users, 50 for standard paid users and 100 for business/institution users, replacing the earlier 10-free/20-paid policy.

**Why:** The user explicitly selected “Use 20/50/100 by plan” when reviewing the attached open-source improvement research.

**How to apply:** Treat this as approved planning direction, not proof of implementation. Check current entitlement on the hosted server and apply totals consistently to page creation, duplication, imports, merges and sharing. Preserve oversized documents for recovery rather than truncating them. Standalone and founder limits were not settled by this hosted-limits answer; keep standalone usable without account dependencies and do not infer a founder bypass.

Destructive page actions need visible in-app confirmations, not native browser confirmation popups.

**Why:** Clear and Delete were reported as doing nothing in the user's embedded/browser environment. A full device reset must be clearly distinguished from editing one page.

**How to apply:** Preserve Undo for page edits and preserve private notes when clearing visual content. A full reset must explicitly warn that it is irreversible and must not remove accounts, cloud files or external local files.

Verify Cloudflare write permissions independently of connection health and read access.

**Why:** A healthy connected OAuth grant could list R2 buckets and read the Workers subdomain while bucket creation returned authentication error 10000. This did not involve any AfroAI key.

**How to apply:** Check the granted permissions and the actual required operation before claiming cloud storage is configured. Resolve Cloudflare authorization through its secure connection flow, not by rotating unrelated application keys.

The account lesson library uses bounded private PostgreSQL binary storage until an application-capable Cloudflare connection is approved. Cloudflare remains the requested direction for hosted file storage; do not claim that account lesson assets are currently stored there.

**Why:** The available Cloudflare connection exposes management tools only, which application code cannot call. Using the existing private database avoids blocking cross-device access or inventing credentials, with atomic ownership, quota and document updates. This is a scoped storage tradeoff, not permission to replace the account database or silently fall back between backends.

**How to apply:** If moving library assets to Cloudflare, first establish runtime upload/read/delete permissions and migrate existing account copies safely. Preserve downloads, account isolation and saved-versus-recent retention boundaries.
