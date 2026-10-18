---
name: BrightboardTV file storage
description: Hosted Cloudflare files, standalone local-file permissions, and large-lesson recovery safeguards.
---

The user requested Cloudflare file storage for the hosted application and direct local storage access for standalone.

**Why:** Large imported presentations repeatedly exceeded browser localStorage capacity and prevented opening the stage, even after following the suggested saving procedure.

**How to apply:** Use private Cloudflare storage for hosted presentation files, without moving the existing account database or exposing other customers' files. Keep standalone independent of cloud credentials. Browser access to actual local files must require explicit permission; unsupported devices need visible import/export fallbacks. Durable browser drafts need a large-object store, migration must commit before old copies are removed, and a save indicator must report persistence success rather than network availability.

BrightboardTV presentations must have a maximum of 10 pages for free users and 20 for paid users.

**Why:** The user explicitly requested these limits to help reduce presentation storage problems.

**How to apply:** Check current paid entitlement on the hosted server, apply the total to page creation, duplication, imports, merges and sharing, and preserve older oversized documents for recovery rather than truncating them. Standalone remains usable without account dependencies and defaults to the free limit.

Destructive page actions need visible in-app confirmations, not native browser confirmation popups.

**Why:** Clear and Delete were reported as doing nothing in the user's embedded/browser environment. A full device reset must be clearly distinguished from editing one page.

**How to apply:** Preserve Undo for page edits and preserve private notes when clearing visual content. A full reset must explicitly warn that it is irreversible and must not remove accounts, cloud files or external local files.

Verify Cloudflare write permissions independently of connection health and read access.

**Why:** A healthy connected OAuth grant could list R2 buckets and read the Workers subdomain while bucket creation returned authentication error 10000. This did not involve any AfroAI key.

**How to apply:** Check the granted permissions and the actual required operation before claiming cloud storage is configured. Resolve Cloudflare authorization through its secure connection flow, not by rotating unrelated application keys.
