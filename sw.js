// Offline support: serve the saved copy right away, refresh it in the background when online.
// Bump CACHE with every release so phones pick up the new files.
const CACHE = 'notch-v2';
const ASSETS = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/app.js', './js/db.js', './js/diagrams.js', './js/pdf.js', './js/units.js',
  './data/course.json', './data/level1.json', './data/level2.json', './data/glossary.json', './data/measurements.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const fresh = fetch(req, { cache: 'no-cache' }).then(async res => {
    if (res.ok) { const c = await caches.open(CACHE); await c.put(req, res.clone()); }
    return res;
  }).catch(() => null);
  e.waitUntil(fresh);
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const net = await fresh;
    if (net) return net;
    return (req.mode === 'navigate' && await caches.match('./index.html')) || new Response('Offline', { status: 503 });
  })());
});
