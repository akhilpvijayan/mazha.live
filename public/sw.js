const CACHE = 'mazha-v3';

// Static assets cached on install (cache-first, long-lived)
const STATIC = [
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.svg',
  '/india_state.geojson',
];

// Assets served network-first so updates are always applied immediately.
// Falls back to cache when offline.
const NETWORK_FIRST = ['/', '/index.html'];

// Third-party / dynamic origins — always network, no caching.
function isExternal(url) {
  return (
    url.hostname.includes('postalpincode') ||
    url.hostname.includes('nominatim') ||
    url.hostname.includes('carto') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('pagead') ||
    url.hostname.includes('googlesyndication')
  );
}

/* ── INSTALL: pre-cache static assets ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

/* ── ACTIVATE: purge old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH: routing strategy ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // External / API — always network, never cache
  if (isExternal(url)) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // HTML entry points — network-first so new deploys are instant
  if (NETWORK_FIRST.includes(url.pathname) || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // JS / CSS / other assets — stale-while-revalidate:
  // serve cache immediately, refresh cache in background
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        });
        return cached || networkFetch;
      })
    )
  );
});

/* ── MESSAGE: handle SKIP_WAITING from app ── */
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ─────────── PUSH NOTIFICATIONS ─────────── */
self.addEventListener('push', e => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch { data = { title: 'Mazha.Live', body: e.data.text() }; }
  const opts = {
    body: data.body || 'Heavy rain reported nearby',
    icon: data.icon || '/icon-192.svg',
    badge: data.badge || '/icon-192.svg',
    tag: data.tag || 'mazha-rain',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'view', title: 'View on Map' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  e.waitUntil(self.registration.showNotification(data.title || 'Mazha.Live Alert', opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const pin = e.notification.data?.pin;
  const url = pin ? `/?pin=${pin}` : '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const ex = list.find(c => c.url.startsWith(self.location.origin));
      if (ex) { ex.focus(); ex.postMessage({ type: 'OPEN_PIN', pin }); }
      else clients.openWindow(url);
    })
  );
});
