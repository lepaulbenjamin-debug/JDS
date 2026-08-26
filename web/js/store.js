// État de l'application + persistance locale (localStorage).
// Aucune donnée ne quitte l'appareil, sauf les photos envoyées explicitement
// à l'IA depuis l'écran de scan.

const KEY = 'jds.state.v1';

export const PLAYER_COLORS = [
  '#f5c518', '#60a5fa', '#f472b6', '#34d399',
  '#fb923c', '#a78bfa', '#22d3ee', '#f87171',
];

const DEFAULT_STATE = {
  v: 1,
  match: null,
  history: [],
  // Carnet des joueurs habituels : une identité stable d'une partie à
  // l'autre, ce qui permet de tenir des statistiques.
  people: [],
  lastPlayers: [],
  settings: {
    ai: { mode: 'server', serverUrl: '', apiKey: '' },
  },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    const merged = {
      ...clone(DEFAULT_STATE),
      ...parsed,
      settings: { ...clone(DEFAULT_STATE.settings), ...(parsed.settings ?? {}) },
    };
    // Reprise des versions antérieures : les derniers noms utilisés
    // constituent le carnet de départ, plutôt que de repartir de zéro.
    if (merged.people.length === 0 && merged.lastPlayers.length > 0) {
      merged.people = merged.lastPlayers.map(makePerson);
    }
    return merged;
  } catch {
    return clone(DEFAULT_STATE);
  }
}

let state = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota plein ou mode privé : on continue en mémoire */
  }
}

function emit() {
  for (const fn of listeners) fn(state);
}

export const store = {
  get state() {
    return state;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Applique une mutation sur l'état, persiste, notifie. */
  update(mutator) {
    mutator(state);
    if (state.match) state.match.updatedAt = Date.now();
    persist();
    emit();
  },
  /**
   * Enregistre l'état sans notifier : pour les champs de saisie, qui écrivent
   * directement dans l'état et ne doivent pas être re-rendus pendant la frappe.
   */
  touch() {
    if (state.match) state.match.updatedAt = Date.now();
    persist();
  },
  reset() {
    state = clone(DEFAULT_STATE);
    persist();
    emit();
  },
};

// --- Fabriques -------------------------------------------------------------

export function makePlayer(name, index, personId = null) {
  return {
    id: uid(),
    name: name.trim(),
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    // Lien vers le carnet, quand le joueur en vient : c'est lui qui permet
    // d'agréger les statistiques sur plusieurs parties.
    personId,
  };
}

/** Entrée du carnet : identité durable, avec une couleur qui lui reste. */
export function makePerson(name, index = 0) {
  return {
    id: uid(),
    name: String(name).trim(),
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    createdAt: Date.now(),
  };
}

/** Un joueur de partie construit à partir d'une entrée du carnet. */
export function playerFromPerson(person, index) {
  return {
    id: uid(),
    name: person.name,
    color: person.color ?? PLAYER_COLORS[index % PLAYER_COLORS.length],
    personId: person.id,
  };
}

export function makeMatch(game, players, target, options = {}, endMode = null) {
  return {
    id: uid(),
    gameId: game.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    players,
    target,
    // Comment cette partie-là s'arrête : au score, ou après N manches. Certains
    // jeux laissent le choix ; les autres n'ont qu'une façon de finir, et les
    // parties d'avant ce réglage retombent sur celle du jeu.
    endMode: endMode ?? game.endMode ?? 'score',
    // Variantes choisies avant de commencer (litige à la belote, bonus au
    // Skull King) : elles changent le calcul, pas la saisie.
    options,
    // La table a décidé de jouer au-delà de ce qui était convenu : la partie
    // ne s'arrête plus d'elle-même, elle s'arrête quand on l'archive.
    prolonge: false,
    // Ce qu'il a fallu demander à la table pour appliquer le départage prévu
    // par le livret, quand le décompte ne le contenait pas (aux Aventuriers du
    // Rail : le nombre de cartes Destination réussies, et non leurs points).
    tieData: {},
    rounds: [],
    draft: makeDraft(game, players),
    finished: false,
  };
}

/**
 * @param {string|null} mode Mode de saisie à conserver. Sans lui, une partie
 *   au Papayoo renverrait aux « Cartes » après chaque manche validée : celui
 *   qui préfère taper ses points devrait rebasculer à chaque fois.
 */
export function makeDraft(game, players, rounds = [], mode = null) {
  return {
    mode: mode ?? (game.supportsTokens ? 'tokens' : 'manual'),
    scores: Object.fromEntries(players.map((p) => [p.id, ''])),
    assign: {},
    // Informations propres au jeu, demandées avant de valider la manche
    // (au Skyjo : qui a retourné ses douze cartes en premier).
    extras: {},
    // Jeux à saisie par formulaire (Tarot) : description de la donne, à
    // partir de laquelle le jeu calcule le score de chacun.
    form: game.formDefaults?.(players, rounds) ?? {},
    editingRoundId: null,
    activePlayerId: players[0]?.id ?? null,
  };
}

export function makeRoundId() {
  return uid();
}

// --- Calculs ---------------------------------------------------------------

/** Totaux cumulés par joueur. */
export function totals(match) {
  const out = Object.fromEntries(match.players.map((p) => [p.id, 0]));
  for (const round of match.rounds) {
    for (const p of match.players) out[p.id] += Number(round.scores[p.id] ?? 0);
  }
  return out;
}

/**
 * Comparaison de deux joueurs selon le sens du jeu, puis selon le départage
 * que prévoit son livret. Renvoie 0 quand rien ne les sépare — c'est cette
 * valeur-là qui fait les ex æquo, et il ne faut donc pas la contourner.
 */
function comparer(game, match) {
  return (a, b) => {
    const ecart = game.lowestWins ? a.total - b.total : b.total - a.total;
    if (ecart !== 0) return ecart;
    // Certains livrets départagent par autre chose que le score (au 7 Wonders,
    // le trésor ; aux Aventuriers du Rail, les destinations réussies).
    return game.tieBreak?.(a.player, b.player, match) ?? 0;
  };
}

/**
 * Classement (meilleur en premier), chaque entrée portant son rang.
 *
 * Deux joueurs que rien ne sépare partagent le même rang. C'est le seul
 * traitement honnête : quand le livret ne prévoit pas de départage — au
 * Papayoo, au Skyjo, au 6 qui prend — désigner un vainqueur reviendrait à
 * trancher au hasard, sur l'ordre où les prénoms ont été tapés.
 */
export function standings(match, game) {
  const t = totals(match);
  const cmp = comparer(game, match);
  const board = match.players.map((p) => ({ player: p, total: t[p.id] })).sort(cmp);
  let rang = 1;
  return board.map((entry, i) => {
    if (i > 0 && cmp(board[i - 1], entry) !== 0) rang = i + 1;
    return { ...entry, rank: rang };
  });
}

/** Le ou les joueurs en tête : plusieurs quand le livret ne les départage pas. */
export function winners(match, game) {
  return standings(match, game).filter((e) => e.rank === 1);
}

/**
 * Recalcule toutes les manches dans l'ordre, chacune à partir des seules
 * manches qui la précèdent.
 *
 * Nécessaire aux jeux dont une manche dépend de l'état laissé par les
 * précédentes : au Mölkky, ce que rapporte un lancer dépend du total déjà
 * acquis. Sans ça, corriger ou supprimer un lancer laisserait tous les
 * suivants avec un calcul périmé.
 */
export function replay(match, game) {
  if (!game.replays || !game.finalize) return;
  match.rounds.forEach((round, i) => {
    const ctx = {
      extras: round.extras,
      options: match.options ?? {},
      rounds: match.rounds.slice(0, i),
    };
    const res = game.finalize(round.raw ?? {}, ctx, match.players);
    round.scores = res.scores;
    round.meta = res.meta ?? null;
  });
}

/**
 * La partie est-elle arrivée à son terme ?
 * Selon le jeu, on s'arrête à un score cible ou après un nombre de donnes.
 */
export function isOver(match, game) {
  if (match.rounds.length === 0) return false;
  // Certains jeux ont leur propre fin de partie (au Mölkky : il ne reste
  // qu'un joueur non éliminé).
  if (game.finished?.(match)) return true;
  if ((match.endMode ?? game.endMode) === 'rounds') return match.rounds.length >= match.target;
  return Object.values(totals(match)).some((v) => v >= match.target);
}
