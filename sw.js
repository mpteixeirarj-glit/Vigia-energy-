/* Vigia Energy — service worker único (escopo: raiz do repositório, cobre /energy/).
 * Navegação: network-first (pega versão nova quando há rede, cai no cache offline).
 * Assets: cache-first. Só respostas same-origin `basic` são guardadas.
 * A CADA atualização: suba VERSAO aqui E VE_VERSAO em version.js (devem ser iguais). */
var VERSAO = 've-2.11.0';
var ARQUIVOS = [
  './', 'index.html', 'common.css', 'firebase-config.js', 'auth.js', 'nuvem.js', 'version.js', 'manifest.json',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'fonts/press-start-2p.woff2',
  'energy/', 'energy/index.html', 'energy/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('ve-') === 0 && k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Os outros Vigias (vigia/, AUTO-VIGIA-/) vivem na MESMA origem e, ao ativar,
 * apagam todo cache que não é deles. Por isso, a cada navegação online,
 * conferimos se o nosso cache ainda existe e o recriamos se sumiu. */
function garantirPrecache() {
  return caches.open(VERSAO).then(function (c) {
    return c.match('energy/app.js').then(function (r) { return r || c.addAll(ARQUIVOS.map(function (u) { return new Request(u, { cache: 'reload' }); })); });
  }).catch(function () {});
}

function guardar(req, res) {
  if (res && res.ok && res.type === 'basic') {
    var copia = res.clone();
    caches.open(VERSAO).then(function (c) { c.put(req, copia); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) { e.waitUntil(garantirPrecache()); return guardar(req, r); }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (r) {
    return r || fetch(req).then(function (res) { return guardar(req, res); });
  }));
});
