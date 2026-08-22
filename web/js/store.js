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

export function makeMatch(game, players, target, options = {}) {
  return {
    id: uid(),
    gameId: game.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    players,
    target,
    // Variantes choisies avant de commencer (litige à la belote, bonus au
    // Skull King) : elles changent le calcul, pas la saisie.
    options,
    rounds: [],
    draft: makeDraft(game, players),
    finished: false,
  };
}

export function makeDraft(game, players, rounds = []) {
  return {
    mode: game.supportsTokens ? 'tokens' : 'manual',
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

/** Classement (meilleur en premier) selon le sens du jeu. */
export function standings(match, game) {
  const t = totals(match);
  return match.players
    .map((p) => ({ player: p, total: t[p.id] }))
    .sort((a, b) => {
      const ecart = game.lowestWins ? a.total - b.total : b.total - a.total;
      if (ecart !== 0) return ecart;
      // Certains jeux départagent les ex æquo par autre chose que le score
      // (au 7 Wonders, le trésor) : sans ça le tableau désignerait au hasard.
      return game.tieBreak?.(a.player, b.player, match) ?? 0;
    });
}

/**
 * La partie est-elle arrivée à son terme ?
 * Selon le jeu, on s'arrête à un score cible ou après un nombre de donnes.
 */
export function isOver(match, game) {
  if (match.rounds.length === 0) return false;
  if (game.endMode === 'rounds') return match.rounds.length >= match.target;
  return Object.values(totals(match)).some((v) => v >= match.target);
}
