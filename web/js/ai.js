// Lecture d'une photo par l'IA : redimensionnement local, puis appel
// soit au serveur (clé API côté serveur), soit directement à l'API Anthropic
// avec la clé saisie par l'utilisateur (stockée sur l'appareil uniquement).

import { buildPayload, parseResponse } from './vision-prompt.js';

const MAX_EDGE = 1568; // au-dela, l'API redimensionne de toute façon

/** Redimensionne + compresse une image en JPEG base64. */
export async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  return {
    dataUrl,
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mediaType: 'image/jpeg',
    width,
    height,
  };
}

/**
 * Envoie l'image et renvoie l'objet structuré décrit dans vision-prompt.js.
 * @param {{image:{base64:string, mediaType:string}, mode:string, players:string[], roundTotal:number, settings:object}} args
 */
export async function scan({ image, mode, players, roundTotal, settings }) {
  const payload = {
    mode,
    players,
    roundTotal,
    imageBase64: image.base64,
    mediaType: image.mediaType,
  };

  if (settings.mode === 'direct') {
    return scanDirect(payload, settings.apiKey);
  }
  return scanViaServer(payload, settings.serverUrl);
}

async function scanViaServer(payload, serverUrl) {
  const base = (serverUrl || '').replace(/\/$/, '');
  const res = await fetch(`${base}/api/scan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Le serveur a répondu ${res.status}.`);
  }
  return body;
}

async function scanDirect(payload, apiKey) {
  if (!apiKey) throw new Error('Aucune clé API enregistrée (Réglages > Lecture IA).');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(buildPayload(payload)),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 401) throw new Error('Clé API refusée. Vérifiez-la dans les réglages.');
    if (res.status === 429) throw new Error('Trop de requêtes, réessayez dans un instant.');
    throw new Error(`Appel API échoué : ${detail}`);
  }
  return parseResponse(body);
}

/**
 * Fait correspondre un nom lu par l'IA a un joueur de la partie.
 * Comparaison insensible à la casse et aux accents, puis préfixe commun.
 */
export function matchPlayer(name, players) {
  const norm = (s) =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const target = norm(name);
  if (!target) return null;

  const exact = players.find((p) => norm(p.name) === target);
  if (exact) return exact;

  const prefix = players.find((p) => {
    const n = norm(p.name);
    return n.startsWith(target) || target.startsWith(n);
  });
  if (prefix) return prefix;

  const initial = players.filter((p) => norm(p.name)[0] === target[0]);
  return initial.length === 1 ? initial[0] : null;
}
