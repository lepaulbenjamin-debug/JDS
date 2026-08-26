// Dialogue avec le relais de salons.
//
// Deux choses seulement se passent ici, mais la seconde est le cœur du jeu.
//
// 1. Des appels HTTP courts. Pas de WebSocket : les points dépendent de la
//    rapidité *mesurée sur le pupitre*, pas de l'instant où le relais reçoit la
//    réponse, donc la latence n'entre jamais dans le score et un simple sondage
//    suffit largement.
//
// 2. Le calage d'horloge. Tous les pupitres doivent découvrir la question au
//    même instant, sinon celui dont le téléphone sonde à contretemps part avec
//    une demi-seconde de retard — sur un barème dégressif, c'est la partie
//    faussée. Chaque réponse du relais porte son heure ; on en déduit l'écart
//    avec l'horloge locale, et tout le jeu se raisonne ensuite en heure relais.

const RELAY_KEY = 'quizroom.relay';

/** Repli sur la même origine : le cas normal quand on sert la PWA soi-même. */
export function relayBase() {
  try {
    return localStorage.getItem(RELAY_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setRelayBase(url) {
  try {
    if (url) localStorage.setItem(RELAY_KEY, url.replace(/\/+$/, ''));
    else localStorage.removeItem(RELAY_KEY);
  } catch { /* navigation privée : on se contentera de l'origine courante */ }
}

/* --- Horloge ------------------------------------------------------------- */

// Estimation à la Cristian : on retient l'échantillon dont l'aller-retour a été
// le plus court, parce que c'est celui dont l'hypothèse « la moitié à l'aller,
// la moitié au retour » est la moins fausse.
let offset = 0;
let bestRtt = Infinity;

function noteClock(serverNow, sentAt, receivedAt) {
  if (!Number.isFinite(serverNow)) return;
  const rtt = receivedAt - sentAt;
  if (rtt > bestRtt * 2 && bestRtt !== Infinity) return;
  if (rtt <= bestRtt) {
    bestRtt = rtt;
    offset = serverNow + rtt / 2 - receivedAt;
  }
}

/** L'heure du relais, telle que ce pupitre la reconstitue. */
export function serverNow() {
  return Date.now() + offset;
}

export function clockQuality() {
  return bestRtt;
}

/* --- Appels -------------------------------------------------------------- */

async function call(method, params = {}, body) {
  const url = new URL(`${relayBase()}/api/room`, location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  const sentAt = Date.now();
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const receivedAt = Date.now();

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    throw Object.assign(new Error(payload?.error ?? 'Le relais ne répond pas.'), {
      status: res.status,
    });
  }
  noteClock(payload?.now, sentAt, receivedAt);
  return payload;
}

export const createRoom = () => call('POST', {}, {});

/**
 * Entrer dans un salon. Le relais renvoie l'identifiant retenu : c'est lui qui
 * fait foi, et l'appelant doit l'adopter — sans quoi la régie ne reconnaîtrait
 * plus ce joueur dans sa propre table et ses réponses ne compteraient pas.
 */
export const joinRoom = (code, joueur) =>
  call('POST', { code, action: 'join' }, { playerId: joueur.id, name: joueur.name });

export const pollRoom = (code, since) => call('GET', { code, since });

export const sendAnswer = (code, answer) =>
  call('POST', { code, action: 'answer' }, answer);

export const publishState = (code, hostToken, state) =>
  call('POST', { code }, { hostToken, state });
