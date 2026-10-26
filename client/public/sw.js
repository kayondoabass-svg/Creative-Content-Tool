const CACHE_NAME = 'brightboard-shell-brand-v2';
const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/logo.png',
  '/brand-symbol.svg',
  '/brand-logo.svg',
  '/brand-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key === 'brightboard-v1' ||
          (key.startsWith('brightboard-shell-') && key !== CACHE_NAME))
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // The root worker must not cache or intercept the separate TV application.
  if (url.origin !== self.location.origin ||
      /^\/(?:tv|tv-assets|api)(?:\/|$)/.test(url.pathname)) return;
  const isNavigation = event.request.mode === 'navigate';
  const isStaticAsset = STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/assets/');
  if (!isNavigation && !isStaticAsset) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache only explicit public assets, never signed-in page responses.
        if (response.ok && isStaticAsset && !isNavigation) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.open(CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(event.request);
          return cached || (isNavigation ? await cache.match('/') : undefined) ||
            new Response('Offline. Reconnect and try again.', { status: 503 });
        });
      })
  );
});
