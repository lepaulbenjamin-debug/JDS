// Serveur optionnel.
//   1. sert la PWA (dossier web/) ;
//   2. expose POST /api/scan, qui relaie la photo à l'API Claude avec une clé
//      API qui reste côté serveur.
//
//   ANTHROPIC_API_KEY=sk-ant-... npm start
//
// Sans ce serveur, l'appli fonctionne quand même : le scoring est entièrement
// local, et la lecture IA peut appeler l'API directement depuis le navigateur
// avec une clé saisie dans les réglages.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScan, MAX_BODY } from '../lib/scan.js';
import { handleRoomRequest } from '../lib/rooms.js';
import { handlePackRequest } from '../lib/packs.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const PORT = Number(process.env.PORT ?? 8080);

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
        reject(new Error('Image trop lourde.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleScan(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Corps de requête illisible.' });
  }
  const { status, body } = await runScan(input);
  return sendJson(res, status, body);
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

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const requested = decodeURIComponent(url.pathname);
  const relative = normalize(requested === '/' ? '/index.html' : requested).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(ROOT, relative);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Interdit');
    return;
  }

  try {
    let info = await stat(filePath);
    // `/quiz` doit ouvrir `/quiz/index.html` : l'appli n'est plus seule à la
    // racine depuis que Quiz entre amis vit dans son propre dossier.
    if (info.isDirectory()) {
      // La barre finale n'est pas cosmétique : sans elle, le navigateur résout
      // `js/app.js` en `/js/app.js` et charge le compteur de points à la place
      // de Quiz entre amis.
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
  if (req.url?.startsWith('/api/scan')) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée.' });
    return handleScan(req, res);
  }
  if (req.url?.startsWith('/api/room')) {
    return handleRoom(req, res);
  }
  if (req.url?.startsWith('/api/packs')) {
    return handlePacks(req, res);
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
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY non définie : /api/scan échouera tant qu\'aucune clé n\'est configurée.');
  }
});
