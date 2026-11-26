// Offline support. Every file of one version is saved together when that version installs, and the app
// is always served from that saved copy, so a phone never mixes old and new files.
// Bump CACHE with every release: that's how phones notice there's a new version to fetch.
const CACHE = 'notch-v4';
const ASSETS = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/app.js', './js/core.js', './js/library.js', './js/projects.js', './js/dia3.js', './js/dia4.js', './js/dia5.js', './js/db.js', './js/diagrams.js', './js/pdf.js', './js/units.js',
  './data/course.json', './data/level1.json', './data/level2.json', './data/level3.json', './data/level4.json', './data/level5.json', './data/glossary.json', './data/fabrics.json', './data/troubleshoot.json', './data/measurements.json',
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
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); } catch (err) {
      return (req.mode === 'navigate' && await c.match('./index.html')) || new Response('Offline', { status: 503 });
    }
  })());
});
