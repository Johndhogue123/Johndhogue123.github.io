// Emberholt's service worker, only in the installable build (node build.js app DIR). It keeps the game on the phone so it
// plays offline, and picks up new versions by itself: the build stamps VERSION with a fingerprint of the game, so a new
// game means a new sw.js; the phone notices on its next online start, fetches the new files in the background, and the
// next start after that plays the new version. Saves live in localStorage, which this never touches.
const VERSION = 'a0c5468efe1b';
const CACHE = 'emberholt-' + VERSION, FONTS = 'emberholt-fonts';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', e => {
  // cache:'reload' skips the browser's own short-term cache, so the new version's files are really the new ones
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('emberholt-') && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  // the game's own files: from the cache first (starts at once, works offline), else the network
  if (u.origin === location.origin) {
    e.respondWith(caches.open(CACHE).then(c => c.match(r, { ignoreSearch: true })
      .then(hit => hit || (r.mode === 'navigate' ? c.match('./index.html') : null))
      .then(hit => hit || fetch(r))));
    return;
  }
  // Google Fonts: keep a copy the first time they load, so the lettering stays the same offline (the game works without them)
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(r).then(hit => hit || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') c.put(r, res.clone());
      return res;
    }))));
  }
});
