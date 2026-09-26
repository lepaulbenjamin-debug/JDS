// Le serveur de développement.
//
//   npm start        # http://localhost:8080/quiz/
//
// Il sert `web/` en statique et expose les mêmes routes que les fonctions de
// `api/` sur Vercel — salons, packs, comptes, contact. C'est lui qu'on
// interroge quand on essaie l'application sur un vrai téléphone du réseau
// local, avant de déployer.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleRoomRequest } from '../lib/rooms.js';
import { handlePackRequest } from '../lib/packs.js';
import { handleCompteRequest } from '../lib/comptes.js';
import { handleContactRequest } from '../lib/contact.js';
import { enTetesCors, estPreflight } from '../lib/cors.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const SITE = join(ROOT, 'site');
const PORT = Number(process.env.PORT ?? 8080);

// Le plafond d'un corps de requête. Les routes du quiz échangent du JSON court
// — un état de salon, une réponse, un jeton — jamais un fichier.
const MAX_BODY = 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Corps de requête trop lourd.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleRoom(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let body;
  if (req.method === 'POST') {
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (error) {
      return sendJson(res, 400, { error: error.message || 'Corps de requête illisible.' });
    }
  }
  const { status, body: payload } = await handleRoomRequest({
    method: req.method,
    query: Object.fromEntries(url.searchParams),
    body,
  });
  // Les pupitres sondent en continu : rien de tout ceci n'est cachable.
  res.setHeader('cache-control', 'no-store');
  return sendJson(res, status, payload);
}

async function handlePacks(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let body;
  if (req.method === 'POST') {
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (error) {
      return sendJson(res, 400, { error: error.message || 'Corps de requête illisible.' });
    }
  }
  const { status, body: payload } = await handlePackRequest({
    method: req.method,
    query: Object.fromEntries(url.searchParams),
    body,
  });
  res.setHeader('cache-control', 'private, no-store');
  return sendJson(res, status, payload);
}

async function handleComptes(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let body;
  if (req.method === 'POST') {
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (error) {
      return sendJson(res, 400, { error: error.message || 'Corps de requête illisible.' });
    }
  }
  const { status, body: payload } = await handleCompteRequest({
    method: req.method,
    query: Object.fromEntries(url.searchParams),
    body,
    headers: req.headers,
  });
  res.setHeader('cache-control', 'private, no-store');
  return sendJson(res, status, payload);
}

async function handleContact(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Corps de requête illisible.' });
  }
  const { status, body: payload, html, redirection } = await handleContactRequest({
    method: req.method,
    // Le formulaire envoie du `x-www-form-urlencoded` : on passe le texte brut,
    // `lib/contact.js` sait lire les deux.
    body,
    headers: req.headers,
  });
  res.setHeader('cache-control', 'no-store');
  if (redirection) {
    res.writeHead(status, { location: redirection }).end();
    return;
  }
  if (html) {
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }).end(html);
    return;
  }
  return sendJson(res, status, payload);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const requested = decodeURIComponent(url.pathname);
  const relative = normalize(requested === '/' ? '/index.html' : requested).replace(/^(\.\.[/\\])+/, '');

  // Le même découpage qu'en production, et c'est le point : `build-web.mjs`
  // publie `web/site/` à la racine du domaine et le jeu en dessous. Servir
  // `web/` tel quel donnerait ici une arborescence qui n'existe nulle part
  // ailleurs — un 404 sur `/` en développement, ou pire, une page qui marche en
  // local et pas en ligne.
  const racine = requested.startsWith('/quiz') ? ROOT : SITE;
  let filePath = join(racine, relative);

  if (!filePath.startsWith(racine)) {
    res.writeHead(403).end('Interdit');
    return;
  }

  try {
    let info = await stat(filePath);
    // `/quiz` doit ouvrir `/quiz/index.html` : le jeu vit dans son dossier, et
    // `web/site/` porte la page d'accueil publiée à la racine du domaine.
    if (info.isDirectory()) {
      // La barre finale n'est pas cosmétique : sans elle, le navigateur résout
      // `js/app.js` en `/js/app.js`, un cran trop haut, et ne trouve rien.
      if (!requested.endsWith('/')) {
        res.writeHead(301, { location: `${requested}/${url.search}` }).end();
        return;
      }
      filePath = join(filePath, 'index.html');
      info = await stat(filePath);
    }
    const data = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
}

/** Les adresses par lesquelles les téléphones du salon peuvent joindre ce poste. */
function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface.address);
}

createServer((req, res) => {
  // Les mêmes en-têtes que sur Vercel : c'est ce serveur qu'on interroge quand
  // on essaie l'application native sur un vrai téléphone du réseau local.
  if (req.url?.startsWith('/api/room') || req.url?.startsWith('/api/packs')
      || req.url?.startsWith('/api/compte')) {
    const cors = enTetesCors(req.headers.origin);
    if (cors) for (const [nom, valeur] of Object.entries(cors)) res.setHeader(nom, valeur);
    if (estPreflight(req.method)) {
      res.writeHead(204).end();
      return;
    }
  }

  if (req.url?.startsWith('/api/room')) {
    return handleRoom(req, res);
  }
  if (req.url?.startsWith('/api/packs')) {
    return handlePacks(req, res);
  }
  if (req.url?.startsWith('/api/compte')) {
    return handleComptes(req, res);
  }
  if (req.url?.startsWith('/api/contact')) {
    return handleContact(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end('Méthode non autorisée');
    return;
  }
  return serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Appli disponible sur http://localhost:${PORT}`);
  // Quiz entre amis ne sert à rien si les invités ne savent pas où se connecter :
  // le serveur écoute sur toutes les interfaces, autant afficher lesquelles.
  for (const address of lanAddresses()) {
    // La barre finale compte : tapée telle quelle sur un téléphone, une adresse
    // sans elle passe par une redirection qu'on peut s'épargner.
    console.log(`  Quiz entre amis, depuis les téléphones : http://${address}:${PORT}/quiz/`);
  }
});
