// Offline cache. Bump VERSION whenever app files change so phones pick up the update.
const VERSION = 'replab-v17';
const FILES = ['./', 'index.html', 'app.js', 'data.js', 'demos.js', 'cloud.js', 'coach.js', 'gen.js', 'program.js', 'chat.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
importScripts('demos.js');
const IMAGES = [...new Set(Object.values(DEMO_MAP))].flatMap(k => [`img/${k}-0.jpg`, `img/${k}-1.jpg`]);
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  // Download all demo photos in the background so they work offline in the gym.
  caches.open(VERSION).then(c => c.addAll(IMAGES)).catch(() => {});
  self.clients.claim();
});
// Network first (so updates arrive when online), cache fallback in the gym basement.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
});
