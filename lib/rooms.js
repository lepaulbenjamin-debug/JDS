// Relais de salons pour la Quiz Room.
//
// Le moteur de jeu tourne sur l'appareil qui a créé le salon — « la régie ».
// Ce module ne connaît ni les questions, ni les points, ni les règles : il
// garde le dernier état publié par la régie, encaisse les réponses des
// pupitres, et donne l'heure. Tant que le relais reste bête, la même partie
// tourne aussi bien derrière `npm start` que derrière une fonction serverless,
// et une évolution des règles ne demande aucun redéploiement du serveur.
//
// L'heure est la seule chose que le relais apporte vraiment au jeu : les points
// dépendent de la rapidité, donc tous les pupitres doivent partir au même
// instant. Ils se calent sur l'horloge du relais, jamais sur la leur.

const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679';
// Ni I/O/0/1 ni S/5 ni B/8 : un code de salon se dicte à voix haute dans un
// salon bruyant, et « zéro » contre « O » est la faute qu'on paie trois fois.

const TTL_MS = 3 * 60 * 60 * 1000;   // un salon oublié disparaît au bout de 3 h
const MAX_PLAYERS = 16;
const MAX_INBOX = 400;               // garde-fou : un pupitre qui boucle ne noie pas le salon
export const MAX_BODY = 256 * 1024;

/* --- Stockage ------------------------------------------------------------ */

// Deux implémentations derrière la même interface. En mémoire, c'est parfait
// pour `npm start` : le serveur vit tant que dure la soirée. En serverless
// chaque requête peut tomber sur une instance différente, donc il faut un
// stockage partagé — Upstash Redis en REST, parce qu'il s'appelle en `fetch`
// sans dépendance à installer.

function memoryStore() {
  const rooms = new Map();

  const alive = (room) => room && Date.now() - room.updatedAt < TTL_MS;

  return {
    kind: 'memory',
    async load(code) {
      const room = rooms.get(code);
      if (!alive(room)) {
        rooms.delete(code);
        return null;
      }
      return room;
    },
    async save(code, room) {
      rooms.set(code, room);
      // Ménage opportuniste : sans processus de fond, on nettoie quand on passe.
      if (rooms.size > 64) {
        for (const [key, value] of rooms) if (!alive(value)) rooms.delete(key);
      }
    },
    async appendAnswer(code, answer) {
      const room = await this.load(code);
      if (!room) return false;
      room.inbox.push(answer);
      if (room.inbox.length > MAX_INBOX) room.inbox.splice(0, room.inbox.length - MAX_INBOX);
      room.updatedAt = Date.now();
      return true;
    },
    async drainAnswers(code) {
      const room = await this.load(code);
      if (!room) return [];
      return room.inbox.splice(0, room.inbox.length);
    },
  };
}

function redisStore(url, token) {
  const call = async (command) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(command),
    });
    if (!res.ok) throw new Error(`Redis ${res.status}`);
    return (await res.json()).result;
  };

  const key = (code) => `quizroom:${code}`;
  const inboxKey = (code) => `quizroom:${code}:inbox`;
  const ttl = Math.floor(TTL_MS / 1000);

  return {
    kind: 'redis',
    async load(code) {
      const raw = await call(['GET', key(code)]);
      return raw ? JSON.parse(raw) : null;
    },
    async save(code, room) {
      // L'inbox vit dans sa propre liste : deux pupitres qui répondent en même
      // temps écriraient sinon l'un par-dessus l'autre.
      const { inbox, ...rest } = room;
      await call(['SET', key(code), JSON.stringify({ ...rest, inbox: [] }), 'EX', String(ttl)]);
    },
    async appendAnswer(code, answer) {
      const exists = await call(['EXISTS', key(code)]);
      if (!exists) return false;
      await call(['RPUSH', inboxKey(code), JSON.stringify(answer)]);
      await call(['EXPIRE', inboxKey(code), String(ttl)]);
      await call(['LTRIM', inboxKey(code), String(-MAX_INBOX), '-1']);
      return true;
    },
    async drainAnswers(code) {
      const items = await call(['LRANGE', inboxKey(code), '0', '-1']);
      if (!items?.length) return [];
      await call(['DEL', inboxKey(code)]);
      return items.map((item) => JSON.parse(item));
    },
  };
}

let store = null;
function getStore() {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  store = url && token ? redisStore(url, token) : memoryStore();
  return store;
}

/* --- Salons -------------------------------------------------------------- */

function newCode() {
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function newToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Réduit une chaîne venue du réseau à quelque chose d'affichable sans risque. */
function cleanName(value) {
  return String(value ?? '')
    .replace(/[\p{C}]/gu, '')
    .trim()
    .slice(0, 18);
}

export function normalizeCode(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

export async function createRoom() {
  const db = getStore();
  // Une collision de code renverrait deux tablées sur le même salon : on
  // regarde avant d'écrire, quitte à retirer quelques fois.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = newCode();
    if (await db.load(code)) continue;
    const now = Date.now();
    const room = {
      code,
      hostToken: newToken(),
      createdAt: now,
      updatedAt: now,
      version: 0,
      state: null,
      players: [],
      inbox: [],
    };
    await db.save(code, room);
    return { code, hostToken: room.hostToken, now };
  }
  throw Object.assign(new Error('Impossible de créer un salon libre.'), { status: 503 });
}

/**
 * Un pupitre entre dans le salon. Le même `playerId` qui revient n'est pas un
 * doublon mais une reconnexion : téléphone verrouillé, Wi-Fi qui saute, onglet
 * fermé par erreur — on retrouve sa place et son score plutôt que d'ajouter un
 * homonyme au classement.
 */
export async function joinRoom(code, { playerId, name }) {
  const db = getStore();
  const room = await db.load(code);
  if (!room) throw Object.assign(new Error('Salon introuvable.'), { status: 404 });

  const cleaned = cleanName(name);
  if (!cleaned) throw Object.assign(new Error('Il faut un prénom.'), { status: 400 });
  const id = String(playerId ?? '').slice(0, 40) || newToken();

  const existing = room.players.find((p) => p.id === id);
  if (existing) {
    existing.name = cleaned;
    existing.seenAt = Date.now();
  } else {
    if (room.players.length >= MAX_PLAYERS) {
      throw Object.assign(new Error(`Salon complet (${MAX_PLAYERS} joueurs).`), { status: 409 });
    }
    room.players.push({ id, name: cleaned, joinedAt: Date.now(), seenAt: Date.now() });
  }

  room.updatedAt = Date.now();
  await db.save(code, room);
  return { playerId: id, players: room.players, state: room.state, version: room.version };
}

/**
 * Lecture d'un pupitre. `since` évite de retransmettre l'état à chaque sondage :
 * pendant qu'une question est affichée, rien ne change côté régie et la réponse
 * tient en quelques octets.
 */
export async function readRoom(code, { since } = {}) {
  const db = getStore();
  const room = await db.load(code);
  if (!room) throw Object.assign(new Error('Salon introuvable.'), { status: 404 });

  const now = Date.now();
  const fresh = Number(since) !== room.version;
  return {
    now,
    version: room.version,
    changed: fresh,
    state: fresh ? room.state : undefined,
    players: fresh ? room.players : undefined,
  };
}

/** Une réponse de pupitre. La régie la relèvera à son prochain battement. */
export async function pushAnswer(code, answer) {
  const db = getStore();
  const ok = await db.appendAnswer(code, {
    playerId: String(answer?.playerId ?? '').slice(0, 40),
    round: Number(answer?.round) || 0,
    choice: Number.isInteger(answer?.choice) ? answer.choice : null,
    joker: typeof answer?.joker === 'string' ? answer.joker.slice(0, 16) : null,
    elapsedMs: Math.max(0, Number(answer?.elapsedMs) || 0),
    at: Date.now(),
  });
  if (!ok) throw Object.assign(new Error('Salon introuvable.'), { status: 404 });
  return { ok: true, now: Date.now() };
}

/**
 * Battement de la régie : elle publie l'état du jeu et récupère dans la même
 * réponse les pupitres présents et les réponses en attente. Un aller-retour par
 * tour de boucle, c'est ce qui permet de tenir la cadence sur un réseau
 * domestique sans WebSocket.
 */
export async function publishState(code, { hostToken, state }) {
  const db = getStore();
  const room = await db.load(code);
  if (!room) throw Object.assign(new Error('Salon introuvable.'), { status: 404 });
  if (room.hostToken !== hostToken) {
    throw Object.assign(new Error('Cet appareil ne tient pas la régie.'), { status: 403 });
  }

  const answers = await db.drainAnswers(code);
  if (state !== undefined) {
    room.state = state;
    room.version += 1;
  }
  room.updatedAt = Date.now();
  await db.save(code, room);

  return { now: Date.now(), version: room.version, players: room.players, answers };
}

/* --- Routage ------------------------------------------------------------- */

/**
 * Aiguillage commun au serveur Node et à la fonction serverless. Tout passe par
 * la chaîne de requête plutôt que par des sous-chemins (`?code=ABCD&action=join`) :
 * une fonction Vercel ne reçoit que son propre chemin, pas ce qui la suit, donc
 * un découpage en segments obligerait à router différemment selon l'hôte.
 *
 *   POST /api/room                        → création d'un salon
 *   GET  /api/room?code=..&since=..       → sondage d'un pupitre
 *   POST /api/room?code=..                → battement de la régie
 *   POST /api/room?code=..&action=join    → arrivée d'un pupitre
 *   POST /api/room?code=..&action=answer  → réponse d'un pupitre
 *
 * Renvoie toujours `{ status, body }`, jamais d'exception vers l'appelant.
 */
export async function handleRoomRequest({ method, query, body }) {
  const code = normalizeCode(query?.code);
  const action = String(query?.action ?? '');

  try {
    if (!code) {
      if (method !== 'POST') return { status: 405, body: { error: 'Méthode non permise.' } };
      return { status: 201, body: await createRoom() };
    }

    if (action === 'join') {
      if (method !== 'POST') return { status: 405, body: { error: 'Méthode non permise.' } };
      return { status: 200, body: await joinRoom(code, body ?? {}) };
    }

    if (action === 'answer') {
      if (method !== 'POST') return { status: 405, body: { error: 'Méthode non permise.' } };
      return { status: 200, body: await pushAnswer(code, body ?? {}) };
    }

    if (action) return { status: 404, body: { error: 'Route inconnue.' } };

    if (method === 'GET') {
      return { status: 200, body: await readRoom(code, { since: query?.since }) };
    }
    if (method === 'POST') {
      return { status: 200, body: await publishState(code, body ?? {}) };
    }
    return { status: 405, body: { error: 'Méthode non permise.' } };
  } catch (err) {
    const status = err?.status ?? 500;
    // Un 500 est un bug de notre côté : il mérite la console du serveur.
    if (status >= 500) console.error('[room]', err);
    return {
      status,
      body: { error: status >= 500 ? 'Le relais a rencontré un problème.' : err.message },
    };
  }
}
