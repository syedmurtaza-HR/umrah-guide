/* Umrah Guide service worker: caches every page so the guide works fully offline. */
const VERSION = '08900f2b59';
const CACHE = 'umrah-guide-' + VERSION;
const PRECACHE = [
  "./",
  "assets/app.css",
  "assets/app.js",
  "assets/fonts.css",
  "assets/fonts/amiri-arabic-400-normal.woff2",
  "assets/fonts/amiri-arabic-700-normal.woff2",
  "assets/fonts/amiri-latin-400-normal.woff2",
  "assets/fonts/amiri-latin-700-normal.woff2",
  "assets/fonts/amiri-latin-ext-400-normal.woff2",
  "assets/fonts/amiri-latin-ext-700-normal.woff2",
  "assets/fonts/atkinson-hyperlegible-latin-400-italic.woff2",
  "assets/fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "assets/fonts/atkinson-hyperlegible-latin-700-normal.woff2",
  "assets/fonts/atkinson-hyperlegible-latin-ext-400-italic.woff2",
  "assets/fonts/atkinson-hyperlegible-latin-ext-400-normal.woff2",
  "assets/fonts/atkinson-hyperlegible-latin-ext-700-normal.woff2",
  "assets/fonts/newsreader-latin-500-normal.woff2",
  "assets/fonts/newsreader-latin-600-normal.woff2",
  "assets/fonts/newsreader-latin-ext-500-normal.woff2",
  "assets/fonts/newsreader-latin-ext-600-normal.woff2",
  "assets/fonts/newsreader-vietnamese-500-normal.woff2",
  "assets/fonts/newsreader-vietnamese-600-normal.woff2",
  "assets/umrah.css",
  "care.html",
  "complete.html",
  "duas.html",
  "icons/apple-touch-icon.png",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-32.png",
  "icons/icon-512.png",
  "icons/icon-maskable-192.png",
  "icons/icon-maskable-512.png",
  "index.html",
  "journey.html",
  "manifest.json",
  "menu.html",
  "mistakes.html",
  "print.html",
  "quick.html",
  "search-index.json",
  "sources.html",
  "step1.html",
  "step2.html",
  "step3.html",
  "step4.html",
  "step5.html",
  "step6.html",
  "step7.html",
  "step8.html",
  "women.html"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('umrah-guide-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: serve from cache instantly, refresh the cache in the background when online.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        if (cached) { event.waitUntil(network); return cached; }
        const res = await network;
        return res || (await cache.match('index.html')) || Response.error();
      })
    );
    return;
  }

  // Everything else (CSS, JS, fonts, icons, search index): cache first, then network.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
      }
      return res;
    }))
  );
});
