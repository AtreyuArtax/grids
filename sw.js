const CACHE_NAME = "grid-pwa-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/plotter.js",
  "/js/equations.js",
  "/js/grid-presets.js",
  "/js/labels.js",
  "/js/main.js",
  "/js/utils.js",
  "/assets/icon-192.png",
  "/assets/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
