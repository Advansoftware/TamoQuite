const CACHE_NAME = 'tamoquite-v2';
const STATIC_ASSETS = [
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Bypass Next.js internal requests to avoid infinite reload loop
  const isNextInternal = 
    url.pathname.startsWith('/_next/') || 
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.has('Next-Router-Prefetch') ||
    request.headers.has('Next-Router-State-Tree');

  if (isNextInternal) {
    return;
  }

  // Check if it's a static asset (images, fonts, bundles, etc.)
  const isStaticAsset = 
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|eot|webmanifest|json)$/) ||
    STATIC_ASSETS.includes(url.pathname);

  if (isStaticAsset) {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  } else {
    // Network-first strategy for dynamic pages and APIs
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful same-origin responses, but not API requests
          if (response.ok && response.type === 'basic' && !url.pathname.startsWith('/api/')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network is unavailable
          return caches.match(request);
        })
    );
  }
});