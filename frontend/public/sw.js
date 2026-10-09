/** Caché de recursos públicos de la interfaz. Excluye API, solicitudes autenticadas y respuestas privadas. */
const CACHE = 'ensambla-shell-v0.4.0';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './energy.css',
  './landing-theme.css',
  './adapt.css',
  './lively.css',
  './readable.css',
  './interaction.css',
  './rhythm.css',
  './composition.css',
  './account.css',
  './api.js',
  './account-client.js',
  './account-views.js',
  './account-controls.js',
  './ambient.js',
  './panel-motion.js',
  './landing-play.js',
  './result-motion.js',
  './assets/landing-comercio-v1.webp',
  './assets/landing-equipo-v1.webp',
  './adapt-domain.js',
  './adapt-ui.js',
  './carousel.js',
  './dialog-guard.js',
  './motion.js',
  './layout-play.js',
  './access.js',
  './licensing.js',
  './app.js',
  './domain.js',
  './store.js',
  './ui.js',
  './landing.js',
  './landing-photos.js',
  './builder.js',
  './runtime.js',
  './pages.js',
  './assets/ensambla.svg',
  './assets/jakarta-0.ttf',
  './assets/jakarta-1.ttf',
  './assets/jakarta-2.ttf',
  './assets/jakarta-3.ttf',
  './assets/jakarta-4.ttf',
  './manifest.webmanifest',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                (k.startsWith('ensambla-demo-') || k.startsWith('ensambla-shell-')) && k !== CACHE,
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname === '/api' ||
    url.pathname.startsWith('/api/') ||
    event.request.headers.has('Authorization')
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response.ok &&
          response.type !== 'opaqueredirect' &&
          !/no-store|private/i.test(response.headers.get('Cache-Control') || '')
        ) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then(
            (cached) =>
              cached ||
              (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()),
          ),
      ),
  );
});
