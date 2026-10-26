---
name: Organisation logo ownership
description: Why saved school branding belongs to each teacher until explicit organisation membership exists
---

Saved school branding must be private to the signed-in teacher. Do not infer shared access from a school name or migrate previously global branding to any account.

**Why:** The former settings were unauthenticated and global, so their ownership could not be established. There is no verified school-membership model that authorises cross-account sharing.

**How to apply:** Keep saved-logo access account-scoped, including browser caches. Future school-wide sharing needs explicit membership and permissions. Selecting a saved logo must remain opt-in; never attach it merely because one exists.

Keep validated JPEG/WebP branding in its original compressed format when saving it; perform exact-logo decoding at composition time.

**Why:** A valid upload below 10MB can expand to a PNG larger than the generation endpoint accepts. Validating by decoding does not imply that the decoded format is safe to store and resubmit as an upload.

**How to apply:** Validate saved branding with the same decoder and pixel limits as local exact-logo uploads, but preserve the original data URL so saved and local uploads remain subject to the same size limits.

Treat an editable design's logo as a private snapshot, not a live reference to the teacher's current organisation branding.

**Why:** Replacing or deleting saved organisation branding must not silently change an existing design. Logo adjustments promise exact recomposition without a new model call; reconstructing missing original backgrounds with AI would break that promise.

**How to apply:** Use retained original sources for edits. If originals were never retained or are no longer available, explain that adjustment is unavailable rather than generating replacement backgrounds or reusing a newly selected organisation logo.

Treat editing-source retention as optional, never as a condition for delivering the finished design.

**Why:** Source limits can be exceeded only after the model has finished. Rejecting the finished image at that point wastes the teacher's wait and provider work for a feature they may never use.

**How to apply:** If a source bundle exceeds its editing budget, still save and return the exact finished composition, but mark logo adjustment unavailable. Account-level source eviction must likewise leave finished designs untouched.
