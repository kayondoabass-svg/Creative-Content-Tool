---
name: Worksheet 45% hang — image generation timeout
description: Why worksheet jobs stall at 45% and how it was fixed
---

## Symptom
Worksheet generation with "include images" enabled (premium users) stalls at 45% and never completes. After 5 minutes the job timeout kills it.

## Root cause
`generateGeminiImage()` in `server/geminiImageService.ts` used plain `fetch()` with no timeout. If Gemini API is slow or unreachable, each of the 4 model attempts hangs indefinitely. Up to 5 images × 4 models = 20 hanging fetches.

## Fix (already applied)
Added `fetchWithTimeout()` helper using `AbortController` with a 25-second limit on every fetch call. Now each model attempt fails fast and moves on, so the worksheet always completes with or without images.

**Why 25s:** Long enough for a real slow response, short enough to not block the 5-minute job timeout.
