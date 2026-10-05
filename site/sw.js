// sw.js: dvr's service worker. Caches the app shell, stale-while-revalidates
// the catalog and thumbnails, passes everything else (the YouTube embed)
// straight through.

// Bump CACHE whenever a SHELL file's content changes, so returning users
// receive the updated shell instead of their frozen first-visit copy.
const CACHE = 'dvr-v3';
const SHELL = [
  './',
  'index.html',
  'app.js',
  'state.js',
  'player.js',
  'style.css',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Same-origin only.
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate for the catalog and thumbnail URLs we own.
  if (url.pathname.endsWith('/catalog.json') || url.pathname.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Cache-first for the app shell; let the browser handle everything else.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Opportunistically cache successful same-origin GET responses.
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
