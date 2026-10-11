// Cache estrito de recursos estáticos conhecidos. Nunca armazena respostas arbitrárias da origem.
const VERSION = 'authix-v11';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/app.js', './js/crypto.js', './js/totp.js', './js/vault.js', './js/qr.js',
  './js/vendor/jsQR.js', './js/vendor/qrcode.js',
  './manifest.json', './icons/icon-192.png', './icons/icon-512.png',
  './assets/logo.png', './assets/favicon.png', './assets/fa/css/fa.min.css',
  './assets/fa/webfonts/fa-solid-900.woff2', './assets/fa/webfonts/fa-regular-400.woff2', './assets/fa/webfonts/fa-brands-400.woff2'
];
const assetURLs = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('authix-') && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !assetURLs.has(url.href)) return;
  event.respondWith(fetch(request).then(async response => {
    if (response.ok && response.type === 'basic') {
      try { await (await caches.open(VERSION)).put(request, response.clone()); } catch { /* Falha de cache não deve bloquear o aplicativo online. */ }
    }
    return response;
  }).catch(async () => (await caches.match(request)) || (request.mode === 'navigate' ? caches.match(new URL('./index.html', self.registration.scope).href) : Response.error())));
});
