---
name: Standalone media editor requirements
description: User requirement for locally generated images, video and audio without external generation APIs.
---

The user wants “an editor with image, video and audio generation” and “Stand alone software not relying on external api,” using the client-side browser approach with HTML5 Canvas and Web Audio APIs.

**Why:** The user explicitly requested local procedural generation rather than dependence on an external generation service.

**How to apply:** Plan rendering, synthesis and exports on the user's device. Do not treat a CDN-dependent demo as an offline deliverable or assume this request authorizes replacing BrightBoard's existing API-backed generators.

The user selected “Add to BrightBoard” after being offered a BrightBoard tool with its own downloadable offline package versus a completely separate app.

**Why:** The user explicitly chose the integrated BrightBoard option.

**How to apply:** Keep this within BrightBoard’s product and branding while retaining independent offline operation; do not reinterpret “standalone” as permission to reorganize the whole project or replace BrightboardTV.

The user chose the product name “BrightBoard Editor,” distinct from Teacher Studio and BrightboardTV.

**Why:** The user explicitly approved renaming the media tool before uploading its open-source release.

**How to apply:** Use BrightBoard Editor for customer-facing branding and public downloads. Preserve existing saved-project formats, local draft storage and API compatibility when changing names.

The user said: “Keep it complete free for now. I will use it first and see then we adjust were necessary.”

**Why:** The user wants to test the media software before deciding on changes or monetization.

**How to apply:** Keep the media editor, downloads and developer API free at launch. Do not require a paid plan, add payment prompts or enable API billing until the user requests that change. Account-owned hosted API keys and technical abuse protections are separate from billing.

Keep the public media software independent of BrightBoard's private website backend.

**Why:** The user wants an open-source downloadable editor without `.env` files, while the main BrightBoard product is not open source.

**How to apply:** Distribute the browser-local editor, renderer and local SDK from an explicit public allowlist. Never ZIP the project root or include private account/payment services, credentials or Git history in the public release.

Require sign-in for the hosted online Editor, even while it is free. Public links should show an introduction before the start action. The downloadable open-source edition remains usable offline without sign-in.

**Why:** The user explicitly selected “Require sign-in” after reporting that footer navigation skipped product details and authentication.

**How to apply:** Keep the introduction public, guard hosted workspace entry and legacy aliases, and preserve the intended destination after sign-in. Do not add account requirements to the independent offline package.
