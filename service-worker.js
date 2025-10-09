const CACHE_NAME = 'health2099-cache-v6-restore-mapfix-v8-v9-v10-map';
const APP_SHELL = [
  './',
  './pocket_health_link.html',
  './Diary.html',
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

const BYPASS_HOSTS = ['tile.openstreetmap.org', 'unpkg.com'];
const BYPASS_CACHE = [
  /assets\/topbar\.bundle\.js/,
  /shared\/vendor\/leaflet\/leaflet\.js/,
  /shared\/vendor\/leaflet\/leaflet\.css/,
  /unpkg\.com\/leaflet/,
  /tile\.openstreetmap\.org/
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
  const isNetworkOnlyMapAsset =
    /tile\.openstreetmap\.org/.test(url.href) || /unpkg\.com\/leaflet/.test(url.href);

  if (isNetworkOnlyMapAsset) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  const shouldBypass = BYPASS_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  const shouldBypassCache = BYPASS_CACHE.some((pattern) => pattern.test(event.request.url));

  if (shouldBypass) {
    return;
  }

  if (shouldBypassCache) {
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
