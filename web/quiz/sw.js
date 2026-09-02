// Service worker de Quiz entre amis.
//
// La coquille et la banque de questions sont mises en cache : une fois la page
// ouverte, elle se relance sans réseau. Le relais, lui, n'est jamais caché —
// c'est la seule chose qui doit être fraîche, et une réponse de salon servie
// depuis le cache figerait la partie.
//
// Deux régimes, et la distinction compte plus qu'il n'y paraît.
//
// La coquille — pages, scripts, feuille de style, banque de questions — part du
// réseau, et ne retombe sur le cache que s'il n'y a pas de réseau. Elle changeait
// jusqu'ici en « cache d'abord » : l'appareil affichait la version enregistrée
// et téléchargeait la nouvelle pour la fois suivante. On jouait donc toujours
// avec la version de la veille, et deux téléphones ouverts à des moments
// différents pouvaient ne pas avoir le même jeu. C'est le genre de retard qui
// ne se voit pas — on croit que la correction n'a pas été déployée.
//
// Le reste — clips audio, icônes — reste en « cache d'abord » : ces fichiers ne
// changent pas sous le même nom, ils pèsent soixante mégaoctets, et les
// redemander à chaque manche coûterait la voix de l'animateur sur un réseau
// hésitant.

const CACHE = 'quizroom-shell-v3';
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
  'icons/icon-192.png',
];

/** Ce qui porte le code du jeu, et doit donc être à jour avant d'être joué. */
const estCoquille = (url) => url.pathname.endsWith('/')
  || /\.(?:html|js|css|webmanifest)$/i.test(url.pathname);

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

/** Met de côté ce qui vient d'arriver, sans faire attendre la page. */
function garder(request, response) {
  if (response.ok) {
    const copie = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copie));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;      // relais : jamais de cache

  if (estCoquille(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => garder(request, response))
        // Hors ligne : la version enregistrée, et à défaut la page d'accueil —
        // une navigation vers une adresse inconnue vaut mieux que l'écran du
        // dinosaure.
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match('index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => hit ?? fetch(request).then((r) => garder(request, r))),
  );
});
