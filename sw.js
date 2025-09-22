// sw.js
// Bump this on every release (date, commit, or number):
const VERSION = '2025-09-21-3';
const CACHE_NAME = `grid-pwa-${VERSION}`;

const ASSETS_TO_CACHE = [
  '/',                 // ensure this serves your app shell
  '/index.html',
  '/css/style.css',
  '/js/plotter.js',
  '/js/equations.js',
  '/js/grid-presets.js',
  '/js/labels.js',
  '/js/main.js',
  '/js/utils.js',
  '/js/modules/gridAPI.js',
  '/js/modules/pointsLayer.js',
  '/js/modules/pointsUI.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

// Install: pre-cache the current release
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  // Take over immediately (no waiting for all tabs to close)
  self.skipWaiting();
});

// Activate: remove old caches + control all clients
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

// Fetch: cache-first for assets (fast) — HTML falls back to cache if offline
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // For navigations (HTML), prefer network to see updated index content quickly,
  // but fall back to cache if offline.
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match('/index.html');
      }
    })());
    return;
  }

  // For static assets: cache-first, then network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (req.method === 'GET' && res && res.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      return cached; // last-resort fallback
    }
  })());
});
