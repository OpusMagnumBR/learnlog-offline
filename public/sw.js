// public/sw.js
const CACHE = 'learnlog-v7';
const ASSETS = [
  './',                    // root w scope /public
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'src/app.js',
  'src/auth.js',
  'src/db.js',
  'src/qr.js'
];

// 1) Instalacja – „miękki” pre‑cache (nie wywala się, gdy jeden plik ma 404)
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of ASSETS) {
      try { await cache.add(url); }
      catch (e) { console.warn('[SW] pomijam w pre-cache:', url, e?.message || e); }
    }
  })());
  self.skipWaiting();
});

// 2) Aktywacja – czyść stare cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 3) Fetch – cache-first dla zasobów z tego samego originu
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Omijamy: inne metody niż GET, inne originy (CDN), oraz endpointy Firebase Auth
  const isSameOrigin = url.origin === self.location.origin;
  const isAuthCall = ['identitytoolkit.googleapis.com', 'securetoken.googleapis.com']
    .some(host => url.hostname.includes(host));

  if (request.method !== 'GET' || !isSameOrigin || isAuthCall) {
    return; // leć normalnie do sieci
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((resp) => {
          // wrzucamy do cache tylko lokalne, udane odpowiedzi typu 'basic'
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return resp;
        })
        .catch(() => {
          // fallback dla nawigacji (SPA / odświeżenie offline)
          if (request.mode === 'navigate') {
            return caches.match('index.html'); // UWAGA: bez wiodącego '/'
          }
        });
    })
  );
});
