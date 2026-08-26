// Service worker de la Quiz Room.
//
// La coquille et la banque de questions sont mises en cache : une fois la page
// ouverte, elle se relance sans réseau. Le relais, lui, n'est jamais caché —
// c'est la seule chose qui doit être fraîche, et une réponse de salon servie
// depuis le cache figerait la partie.

const CACHE = 'quizroom-shell-v1';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/net.js',
  'js/engine.js',
  'js/emcee.js',
  'js/questions.js',
  '../js/ui.js',
  '../js/speech.js',
  '../icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && k.startsWith('quizroom-')).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;      // relais : jamais de cache

  event.respondWith(
    caches.match(request).then((hit) => {
      const reseau = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copie = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copie));
          }
          return response;
        })
        .catch(() => hit ?? caches.match('index.html'));
      return hit ?? reseau;
    }),
  );
});
