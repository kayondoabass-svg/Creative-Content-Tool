---
name: Static screenshot limits
description: Avoid mistaking offscreen lazy-image placeholders in static captures for broken assets.
---

Full-page static captures do not necessarily trigger loading of images outside the initial viewport. URL fragments also may not scroll when the target section mounts after an asynchronous app-loading state.

**Why:** Captures of BrightBoard's landing page showed blank lazy-image panels despite the same assets rendering within the viewport and returning valid image responses. Fragment URLs captured the top of the page rather than the requested section.

**How to apply:** Do not repeatedly take static captures expecting them to scroll or load offscreen images. Use a browser that can scroll after the page mounts for visual verification, or validate asset responses and state clearly what the static capture actually checked.