---
name: Customer checkout scope
description: Owner's requirement for a BrightBoard-centered customer payment experience.
---

Customers should complete purchases inside BrightBoard, with PesaPal connected through the backend and paid services available promptly after confirmed payment.

**Why:** The owner explicitly requested that clients deal only with brightboardapp rather than being directed to PesaPal.

**How to apply:** Prefer PesaPal's documented embedded checkout within BrightBoard. Explain that provider-controlled payment fields, branding and bank or mobile-money authorization may remain visible; do not promise an entirely invisible processor or grant access before authoritative payment confirmation.

Only BrightBoard itself should be allowed to frame BrightBoard pages; block other websites from framing them.

**Why:** The owner explicitly requested this to protect customers from scammers while enabling embedded checkout.

**How to apply:** Preserve same-origin framing restrictions in application and reverse-proxy headers. Explain that clickjacking protection does not prevent all scams or lookalike websites.

Keep incoming anti-framing protection site-wide, but scope the outgoing payment-frame allowlist to checkout.

**Why:** Browser verification showed that a site-wide payment-only frame-src policy also blocked the existing Google advertising frames. Those are unrelated to another site framing BrightBoard.

**How to apply:** Do not remove the anti-clickjacking headers to fix an ad-frame problem. Keep checkout URL validation independent of document policies.
