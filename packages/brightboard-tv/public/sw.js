/* Application-only caching. Never intercept BrightBoard accounts or API data. */
const SHELL = "brightboardtv-v1-shell", ASSETS = "brightboardtv-v1-assets";
const root = new URL("./", self.location).href;
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const response = await fetch(new URL("precache.json", root), { cache: "no-store" });
    if (!response.ok) throw new Error("Offline manifest is unavailable");
    const paths = await response.json();
    const cache = await caches.open(SHELL);
    await cache.addAll(paths.map(p => new URL(p, root).href));
    // Activate on next launch, never interrupt an in-progress presentation.
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith("brightboardtv-") && name.endsWith("-shell") && name !== SHELL) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  const appPath = new URL(root).pathname;
  if (!url.pathname.startsWith(appPath) && !url.pathname.startsWith("/tv-assets/")) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: event.request.mode === "navigate" });
    if (event.request.mode === "navigate") {
      try { return await fetch(event.request); }
      catch { return cached || await caches.match(root) || Response.error(); }
    }
    return cached || fetch(event.request);
  })());
});
