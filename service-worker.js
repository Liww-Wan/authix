// Rede primeiro (pega sempre a versão nova); cache só quando estiver offline.
// Incremente VERSION a cada atualização do projeto.
const VERSION = 'wv-v9';
const ASSETS = [
  './', 'index.html', 'css/style.css',
  'js/app.js', 'js/crypto.js', 'js/totp.js', 'js/vault.js', 'js/qr.js',
  'js/vendor/jsQR.js', 'js/vendor/qrcode.js',
  'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(r, copy));
        }
        return res;
      })
      .catch(() => caches.match(r, { ignoreSearch: true }))
  );
});
