const CACHE_NAME = 'health2099-cache-v1';
const APP_SHELL = [
  './',
  './pocket_health_link.html',
  './DiaryPlus.html',
  './Summary.html',
  './Map.html',
  './shared/styles.css',
  './shared/storage.js',
  './shared/nav-loader.js',
  './shared/vendor/leaflet/leaflet.css',
  './shared/vendor/leaflet/leaflet.js',
  './includes/nav.html',
  './manifest.webmanifest',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './service-worker.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isBypassedHost =
    url.hostname === 'unpkg.com' || url.hostname.endsWith('.tile.openstreetmap.org') || url.hostname === 'tile.openstreetmap.org';

  if (isBypassedHost) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
