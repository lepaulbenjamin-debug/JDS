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
import Anthropic from '@anthropic-ai/sdk';

import { buildPayload, parseResponse } from '../web/js/vision-prompt.js';
import { GAMES } from '../web/js/games/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const PORT = Number(process.env.PORT ?? 8080);
const MAX_BODY = 12 * 1024 * 1024; // ~12 Mo : une photo compressée tient large

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

// Client créé à la première requête : sans clé, le serveur doit quand même
// continuer à servir la PWA (le scoring, lui, n'a besoin de rien).
let client;
function getClient() {
  client ??= new Anthropic(); // lit ANTHROPIC_API_KEY (ou un profil `ant auth login`)
  return client;
}

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

function validateScanInput(input) {
  const errors = [];
  if (typeof input.imageBase64 !== 'string' || input.imageBase64.length < 32) errors.push('image manquante');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(input.mediaType)) errors.push('format d\'image non supporté');
  if (!['scoresheet', 'cards'].includes(input.mode)) errors.push('mode inconnu');
  if (!Array.isArray(input.players)) errors.push('liste de joueurs invalide');
  // Le jeu est résolu ici, à partir d'un identifiant connu : le client ne peut
  // pas injecter de texte dans le prompt système.
  if (!GAMES.some((g) => g.id === input.gameId)) errors.push('jeu inconnu');
  return errors;
}

async function handleScan(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Corps de requête illisible.' });
  }

  const errors = validateScanInput(input);
  if (errors.length) return sendJson(res, 400, { error: `Requête invalide : ${errors.join(', ')}.` });

  try {
    const message = await getClient().messages.create(
      buildPayload({
        mode: input.mode,
        game: GAMES.find((g) => g.id === input.gameId),
        players: input.players.map(String).slice(0, 12),
        imageBase64: input.imageBase64,
        mediaType: input.mediaType,
      }),
    );
    return sendJson(res, 200, parseResponse(message));
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Clé API refusée par Anthropic.');
      return sendJson(res, 502, { error: 'Clé API du serveur invalide.' });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return sendJson(res, 429, { error: 'Trop de requêtes, réessayez dans un instant.' });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Erreur API ${error.status}:`, error.message);
      return sendJson(res, 502, { error: `L'API a répondu ${error.status}.` });
    }
    console.error(error);
    return sendJson(res, 500, { error: "Échec de l'analyse de l'image." });
  }
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
