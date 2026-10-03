---
name: Isolated preview dependencies
description: Avoid incompatible parent-package resolution when working in the mockup sandbox.
---

Keep the mockup preview’s Tailwind dependencies isolated from the main application. Do not upgrade the main app’s Tailwind version solely to repair a preview.

**Why:** The sandbox’s Tailwind 4 Vite plugin can accidentally resolve the parent application’s Tailwind 3 package when its own local dependency is missing. This breaks preview CSS even when the real app works.

**How to apply:** When a preview has a Tailwind resolution failure, verify that its own declared dependency resolves locally before changing the main app or its build configuration.