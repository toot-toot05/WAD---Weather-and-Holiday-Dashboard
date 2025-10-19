/* service-worker.js */
const SW_VER = 'v1';
const STATIC_CACHE = `static-${SW_VER}`;
const API_CACHE = `api-${SW_VER}`;
const OFFLINE_PAGE = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.webmanifest',
  '/offline.html',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];


self.addEventListener('install', (evt) => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![STATIC_CACHE, API_CACHE].includes(k)).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  const isApi = url.pathname.startsWith('/api/')
              || url.hostname.includes('open-meteo.com')
              || url.hostname.includes('air-quality-api.open-meteo.com')
              || url.hostname.includes('date.nager.at')
              || url.hostname.includes('ipapi.co')
              || url.hostname.includes('nominatim.openstreetmap.org');

  if (isApi) {
    // network-first, then cache
    evt.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(API_CACHE);
        cache.put(req, net.clone()).catch(()=>{});
        return net;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'offline-or-no-cache' }), { headers: { 'Content-Type': 'application/json' }});
      }
    })());
    return;
  }

  // static / navigation: cache-first then network
  evt.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(net => {
      // opportunistically cache
      if (['document','script','style','image',''].includes(req.destination)) {
        caches.open(STATIC_CACHE).then(c => c.put(req, net.clone()).catch(()=>{}));
      }
      return net;
    }).catch(() => {
      if (req.mode === 'navigate') return caches.match(OFFLINE_PAGE);
      return new Response('', { status: 504, statusText: 'offline' });
    }))
  );
});
