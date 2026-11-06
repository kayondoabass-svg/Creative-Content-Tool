---
name: Document sharing scope
description: User requirements for account-authenticated sharing across BrightBoard document tools.
---

The user selected “All BrightBoard documents” for sharing, not Editor-only or Editor plus BrightboardTV.

**Why:** The user explicitly chose the broadest scope after requesting a plan.

**How to apply:** Scope sharing across the teaching tools, Teacher Studio, BrightboardTV and BrightBoard Editor. Each document type needs appropriate previews and editable formats; do not imply every exported file has an editable source.

The user requested complete-project sharing using a URL and unique QR when a new edit is made, with owner-controlled read-only access or requests for edit permission. Shared documents should require authentication for new users and flow automatically for existing authenticated users.

**Why:** These are the user's stated sharing requirements.

**How to apply:** Preserve the destination through sign-in and signup/verification, enforce owner-approved editing permissions, and distinguish existing accounts from authenticated sessions. The user approved building the proposed plan: stable project links plus unique URLs and QR codes for explicitly published revisions, rather than publishing every keystroke.

Shared published documents have a separate retention policy from the 24-hour recent-generation history and must not silently expire with that history.

**Why:** The user approved the sharing plan, including durable complete snapshots and preserved older versions; automatic generation-history deletion would break those shared links.

**How to apply:** Keep intentionally published copies until the owner deletes them, distinguish link access expiry from data deletion, and keep free storage bounded with explicit limits.

Use Cloudflare R2 for shared project snapshots and attachments, with D1 for the new sharing system's ownership, permissions, invitations, requests and revision references.

**Why:** The user explicitly selected “R2 + D1 sharing” after clarifying that they expect sharing storage on their Cloudflare account.

**How to apply:** Keep R2 private and mediate access through authenticated BrightBoard routes. Apply this choice only to new sharing; do not migrate or replace existing account, BrightboardTV relay, remote-control or lesson-storage infrastructure. Do not call the earlier PostgreSQL-backed sharing release Cloudflare-backed.
