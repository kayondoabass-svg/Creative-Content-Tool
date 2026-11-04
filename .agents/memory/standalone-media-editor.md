---
name: Standalone media editor requirements
description: User requirement for locally generated images, video and audio without external generation APIs.
---

The user wants “an editor with image, video and audio generation” and “Stand alone software not relying on external api,” using the client-side browser approach with HTML5 Canvas and Web Audio APIs.

**Why:** The user explicitly requested local procedural generation rather than dependence on an external generation service.

**How to apply:** Plan rendering, synthesis and exports on the user's device. Do not treat a CDN-dependent demo as an offline deliverable or assume this request authorizes replacing BrightBoard's existing API-backed generators.
