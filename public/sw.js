const CACHE_NAME = 'gcu-app-cache-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.ico',
  './gd-sprite.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/n-emblem-splash.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
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
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML navigations so fresh builds deploy immediately, with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for immutable build assets, app icons, and streamed OSM GeoJSON map tiles
  const isCacheableAsset =
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.includes('/map-data/') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico');

  if (isCacheableAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
  }
});
