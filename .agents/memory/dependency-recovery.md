---
name: Dependency recovery
description: Security-filtered optional dependencies can make installation succeed while leaving the app unbuildable.
---

Do not treat a successful npm installation as proof that all production build
dependencies are available. Run the production build after dependency recovery,
and validate the actual clean-install path used after merges.

**Why:** The package firewall blocked an optional HTML sanitizer. npm reported
success after skipping it, but the PDF export library still imported it and
the production build failed.

**How to apply:** Preserve the security policy. Update the direct parent first
when it has a newer safe release; if the parent is already current, resolve the
transitive dependency to a safe supported release. Do not externalize or stub a
required sanitizer merely to make the build pass.

Security audits cover every retained lockfile, including standalone distributions,
not just the packages currently loaded by the main app.

**Why:** An obsolete alternate-manager lockfile reported a critical sanitizer
finding even though the npm-managed app already used the patched version.

**How to apply:** Check which lockfile each finding names. Keep independent
distribution locks current and portable, and do not retain an obsolete alternate
lock as if it described the active installation. Still inspect installed versions;
removing stale evidence is not a substitute for patching a real dependency.
