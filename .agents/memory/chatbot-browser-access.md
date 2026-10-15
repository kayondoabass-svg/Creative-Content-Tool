---
name: Chatbot browser access
description: Why server-only chatbot checks are insufficient and BrightBoard routes AfroAI messages through its own origin
---

Do not treat a successful server-to-server AfroAI reply as proof that its browser widget works. Keep browser chat requests on BrightBoard's own origin.

**Why:** AfroAI returned a valid POST reply, but its OPTIONS preflight returned no browser permission headers. Visitors saw "Connection error" even with the correct widget key. AfroAI later moved the widget to a versioned chat API without changing the embed-script URL, breaking the old gateway's exact-string match.

**How to apply:** Preserve the same-origin gateway when updating the widget. Treat the widget adapter and server relay as one provider contract: repairing script loading alone is insufficient if the relay still calls the old API. Verify an actual browser conversation after changing this integration. Keep keys out of source control and do not log visitors' chat bodies or upstream URLs containing the key.