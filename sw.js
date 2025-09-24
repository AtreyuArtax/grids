// sw.js
// Get version from URL parameter (e.g., /sw.js?v=2025-09-22-1)
const urlParams = new URLSearchParams(self.location.search);
const VERSION = urlParams.get('v') || '2025-00-00-0'; // fallback version
const CACHE_NAME = `grid-pwa-${VERSION}`;

const ASSETS_TO_CACHE = [
  './',                 // ensure this serves your app shell
  './index.html',
  './css/style.css',
  './js/plotter.js',
  './js/equations.js',
  './js/grid-presets.js',
  './js/labels.js',
  './js/main.js',
  './js/modalInit.js',
  './js/utils.js',
  './js/modules/errorHandler.js',
  './js/modules/gridAPI.js',
  './js/modules/modalManager.js',
  './js/modules/pointsLayer.js',
  './js/modules/pointsUI.js',
  './assets/icon-192-pwa.png',
  './assets/icon-512-pwa.png',
  './assets/icon-152-ios.png',
  './assets/icon-167-ios.png',
  './assets/icon-180-ios.png'
];

// Install: pre-cache the current release
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // Cache files individually to avoid complete failure if one file is missing
      const cachePromises = ASSETS_TO_CACHE.map(async (asset) => {
        try {
          await cache.add(asset);
          console.log(`Successfully cached: ${asset}`);
        } catch (error) {
          console.warn(`Failed to cache ${asset}:`, error);
          // Continue with other files even if this one fails
        }
      });
      
      await Promise.allSettled(cachePromises);
      console.log(`Service worker installed with cache: ${CACHE_NAME}`);
    })()
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
      // Only cache http/https requests to avoid chrome-extension and other unsupported schemes
      if (req.method === 'GET' && res && res.status === 200 && 
          (req.url.startsWith('http://') || req.url.startsWith('https://'))) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone()).catch(err => {
          console.warn('Failed to cache request:', req.url, err);
        });
      }
      return res;
    } catch {
      return cached; // last-resort fallback
    }
  })());
});
