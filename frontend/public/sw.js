// Service worker for finance-hledger PWA.
//
// Strategy by request kind:
//   - Navigation / HTML       → network-first, fall back to cached /index.html.
//                               Prevents the "stale shell points to dead asset
//                               hash" trap on every redeploy: the shell is
//                               always fresh online; offline still boots.
//   - /assets/* (Vite-hashed) → cache-first, immutable. Safe because the file
//                               name itself changes on every build.
//   - /api/* with Authorization → bypass the SW entirely. Authenticated
//                                 responses are never cached, so they cannot
//                                 leak across sessions or accounts.
//   - /api/* unauthenticated  → network-first with cache fallback (e.g.
//                               /api/auth/mode, /api/health).
//   - Other top-level static  → stale-while-revalidate (manifest, icons).
//
// Update flow:
//   The new SW does NOT skipWaiting on its own. The page detects the waiting
//   worker, shows an inline "atualizar" banner, and posts {type:'SKIP_WAITING'}
//   when the user accepts. controllerchange in the page then reloads.
//
// Cache names embed a major version. Bump SW_VERSION when the strategy itself
// changes (not on every deploy — hashed asset names already handle that).

const SW_VERSION = 'v2';
const PRECACHE = `fh-precache-${SW_VERSION}`;
const RUNTIME = `fh-runtime-${SW_VERSION}`;
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== PRECACHE && k !== RUNTIME)
        .map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isNavigation(req) {
  if (req.mode === 'navigate') return true;
  const accept = req.headers.get('accept') || '';
  return req.method === 'GET' && accept.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    if (request.headers.has('Authorization')) {
      // Authenticated APIs: do not intercept. Browser handles directly,
      // nothing is written to the cache, no cross-session leakage possible.
      return;
    }
    event.respondWith(networkFirst(request));
    return;
  }

  if (isNavigation(request)) {
    event.respondWith(navigationStrategy(request));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const clone = fresh.clone();
      caches.open(RUNTIME).then((cache) => cache.put(request, clone));
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function navigationStrategy(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const clone = fresh.clone();
      caches.open(PRECACHE).then((cache) => cache.put('/index.html', clone));
    }
    return fresh;
  } catch (err) {
    const cached =
      (await caches.match('/index.html')) || (await caches.match('/'));
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) {
    const clone = fresh.clone();
    caches.open(RUNTIME).then((cache) => cache.put(request, clone));
  }
  return fresh;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.ok) {
        const clone = fresh.clone();
        caches.open(RUNTIME).then((cache) => cache.put(request, clone));
      }
      return fresh;
    })
    .catch(() => cached);
  return cached || networkPromise;
}
