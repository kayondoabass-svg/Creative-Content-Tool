---
name: Recent creation retention
description: User-requested 24-hour retention, ownership and export boundaries for generated content
---

Generated creations should remain available to their creator for 24 hours from
creation, survive server restarts during that period, and expire from recent
history afterward. Explain the time limit and provide export before expiry.

**Why:** The user asked to check the existing timing and retain generations for
24 hours. The former memory-only history could disappear on any server restart,
so it did not meet that requirement.

**How to apply:** Use the application's existing PostgreSQL database, keep
history isolated by authenticated user, and base expiry on creation time rather
than last access. Do not treat a short model-response cache or completed-job
cache as durable user history. Downloaded/exported files and explicitly saved
BrightboardTV presentations are user-owned copies, not expiring server history.
