const SHELL_CACHE = 'sipedas-shell-v1';
const STATIC_CACHE = 'sipedas-static-v1';
const STATIC_LIMIT = 80;
const SHELL_ASSETS = [
  '/manifest.json',
  '/assets/hero-petugas-poster.webp',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

function cacheable(response) {
  return response.ok && !(response.headers.get('Cache-Control') || '').toLowerCase().includes('no-store');
}

async function storeStatic(cache, request, response) {
  if (!cacheable(response)) return response;
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  if (keys.length > STATIC_LIMIT) {
    await Promise.all(keys.slice(0, keys.length - STATIC_LIMIT).map((key) => cache.delete(key)));
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    const assets = await caches.open(STATIC_CACHE);

    try {
      const response = await fetch('/');
      if (response.ok) {
        await shell.put('/', response.clone());
        const html = await response.text();
        const bundles = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))["']/g)]
          .map((match) => match[1]);
        await Promise.all(bundles.map(async (url) => {
          try {
            const bundle = await fetch(url);
            await storeStatic(assets, url, bundle);
          } catch { /* Instalasi tetap berhasil saat sebagian aset tidak tersedia. */ }
        }));
      }
    } catch { /* Cache offline adalah peningkatan, bukan syarat untuk membuka situs. */ }

    await Promise.all(SHELL_ASSETS.map(async (url) => {
      try {
        const asset = await fetch(url);
        await storeStatic(assets, url, asset);
      } catch { /* Aset akan dicoba lagi saat diminta. */ }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('sipedas-') && !keep.has(name))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const response = await fetch(request);
        if (cacheable(response)) await cache.put(request, response.clone());
        return response;
      } catch {
        return await cache.match(request) || await cache.match('/') || Response.error();
      }
    })());
    return;
  }

  if (!url.pathname.startsWith('/assets/') && url.pathname !== '/manifest.json') return;

  const cacheUpdate = caches.open(STATIC_CACHE).then(async (cache) => {
    const response = await fetch(request);
    return storeStatic(cache, request, response);
  }).catch(() => null);

  event.waitUntil(cacheUpdate.then(() => undefined));
  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    return await cache.match(request) || await cacheUpdate || Response.error();
  })());
});