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
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScan, MAX_BODY } from '../lib/scan.js';

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

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const requested = decodeURIComponent(url.pathname);
  const relative = normalize(requested === '/' ? '/index.html' : requested).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(ROOT, relative);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Interdit');
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) throw new Error('directory');
    const data = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': relative === '/index.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
}

createServer((req, res) => {
  if (req.url?.startsWith('/api/scan')) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée.' });
    return handleScan(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end('Méthode non autorisée');
    return;
  }
  return serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Appli disponible sur http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY non définie : /api/scan échouera tant qu\'aucune clé n\'est configurée.');
  }
});
