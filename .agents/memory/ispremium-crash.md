---
name: isPremium ReferenceError crash
description: GeneratedContentDisplay used isPremium without declaring it, crashing the whole React tree on every page load.
---

## The rule
Every component that passes `isPremium` as a prop or uses it in JSX **must** call `const { isPremium } = useSubscription()` inside that component. The hook is imported in the file but not called does nothing.

**Why:** `GeneratedContentDisplay` passed `isPremium={isPremium}` to `WorksheetDownloadButtons` at one line while never calling `useSubscription()`. Since this component is imported by every page, the `ReferenceError: isPremium is not defined` crashed the entire React tree on load — caught by the root error boundary added in main.tsx.

**How to apply:** Before using `isPremium` anywhere in a component body, confirm `useSubscription()` is called inside that same component function (not just imported at the file level).
