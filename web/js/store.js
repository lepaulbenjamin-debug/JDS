// État de l'application + persistance locale (localStorage).
// Aucune donnée ne quitte l'appareil, sauf les photos envoyées explicitement
// à l'IA depuis l'écran de scan.

const KEY = 'jds.state.v1';

/**
 * Version du schéma enregistré. À incrémenter dès que la forme des données
 * change, avec la reprise correspondante dans `migrer()`.
 *
 * 1 → 2 : horodatage sur chaque enregistrement et suppression par marqueur,
 *         pour qu'une synchronisation devienne possible sans ressusciter ce
 *         qu'on avait effacé.
 */
export const SCHEMA_DONNEES = 2;

export const PLAYER_COLORS = [
  '#f5c518', '#60a5fa', '#f472b6', '#34d399',
  '#fb923c', '#a78bfa', '#22d3ee', '#f87171',
];

const DEFAULT_STATE = {
  v: SCHEMA_DONNEES,
  match: null,
  history: [],
  // Carnet des joueurs habituels : une identité stable d'une partie à
  // l'autre, ce qui permet de tenir des statistiques.
  people: [],
  lastPlayers: [],
  settings: {
    ai: { mode: 'server', serverUrl: '', apiKey: '' },
    // Version complète : aujourd'hui un interrupteur manuel, demain alimenté
    // par le reçu du store. Un seul point d'entrée, pour n'avoir qu'une chose
    // à brancher le jour de l'empaquetage.
    premium: false,
  },
  // Consommation du mois en cours pour la lecture photo — la seule fonction
  // qui coûte de l'argent à chaque usage.
  quota: { mois: null, lectures: 0 },
};

/**
 * Lectures photo offertes chaque mois sans la version complète.
 *
 * Le chiffre se règle sur le coût réel d'une lecture : il doit rester assez
 * généreux pour que la fonction se découvre et serve vraiment, assez borné
 * pour qu'un usage intensif ne coûte pas plus qu'il ne rapporte.
 */
export const LECTURES_OFFERTES = 10;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Amène un état enregistré au schéma courant. Ne détruit rien : ce qui manque
 * est ajouté, ce qui existe est laissé tel quel.
 */
export function migrer(etat) {
  const out = {
    ...clone(DEFAULT_STATE),
    ...etat,
    settings: { ...clone(DEFAULT_STATE.settings), ...(etat.settings ?? {}) },
  };

  // Reprise des versions antérieures : les derniers noms utilisés
  // constituent le carnet de départ, plutôt que de repartir de zéro.
  if (out.people.length === 0 && out.lastPlayers.length > 0) {
    out.people = out.lastPlayers.map(makePerson);
  }

  // Schéma 2 : chaque enregistrement porte une date de dernière modification.
  // C'est elle qui départagera deux versions d'une même partie le jour où
  // l'appli synchronisera ; sans elle, impossible de savoir laquelle garder.
  out.history = out.history.map((h) => ({ ...h, updatedAt: h.updatedAt ?? h.createdAt ?? 0 }));
  out.people = out.people.map((p) => ({ ...p, updatedAt: p.updatedAt ?? p.createdAt ?? 0 }));

  out.quota = { mois: null, lectures: 0, ...(etat.quota ?? {}) };
  out.v = SCHEMA_DONNEES;
  return out;
}

/** Vrai quand l'état lu venait d'un schéma antérieur et a dû être repris. */
let repris = false;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    repris = parsed.v !== SCHEMA_DONNEES;
    return migrer(parsed);
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

// Un schéma repris doit être réenregistré tout de suite. Sinon un appareil sur
// lequel on ne joue pas garde indéfiniment l'ancienne forme sur le disque, et
// la prochaine version de l'appli la croirait déjà convertie.
if (repris) persist();

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
    updatedAt: Date.now(),
    deletedAt: null,
  };
}

// --- Suppressions et lectures ---------------------------------------------

/**
 * Ce qui reste après les suppressions.
 *
 * Effacer pour de bon suffirait tant que les données ne quittent pas
 * l'appareil. Le jour où deux appareils se parlent, une suppression qui ne
 * laisse aucune trace est indistinguable d'un enregistrement jamais reçu : la
 * partie effacée d'un côté revient de l'autre. On garde donc l'enregistrement,
 * marqué d'une date de suppression, et on le cache partout à la lecture.
 */
export function vivants(liste) {
  return (liste ?? []).filter((x) => !x.deletedAt);
}

/** Les parties archivées encore visibles. */
export function archives(state) {
  return vivants(state.history);
}

/** Le carnet de joueurs encore visible. */
export function carnet(state) {
  return vivants(state.people);
}

/**
 * Marque un enregistrement comme supprimé, dans la liste où il se trouve.
 * La date de modification bouge aussi : c'est elle qui fera gagner la
 * suppression sur une version plus ancienne du même enregistrement.
 */
export function supprimer(liste, id) {
  const cible = (liste ?? []).find((x) => x.id === id);
  if (!cible) return;
  cible.deletedAt = Date.now();
  cible.updatedAt = Date.now();
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

// --- Quota de lecture photo ------------------------------------------------

/** Le mois courant, sous une forme comparable : « 2026-08 ». */
function moisCourant(maintenant = new Date()) {
  return `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Ce qu'il reste de lectures photo ce mois-ci.
 *
 * Le renouvellement se fait à la lecture plutôt que par une tâche de fond :
 * un compteur posé sur un mois révolu vaut un compteur remis à zéro.
 *
 * @returns {{premium: boolean, restantes: number, offertes: number, utilisees: number}}
 */
export function quotaPhoto(state, maintenant = new Date()) {
  const premium = Boolean(state.settings?.premium);
  const q = state.quota ?? {};
  const utilisees = q.mois === moisCourant(maintenant) ? Number(q.lectures) || 0 : 0;
  return {
    premium,
    offertes: LECTURES_OFFERTES,
    utilisees,
    restantes: premium ? Infinity : Math.max(0, LECTURES_OFFERTES - utilisees),
  };
}

/**
 * Décompte une lecture. À n'appeler qu'une fois la lecture réussie : une
 * erreur réseau ou un refus du serveur ne doit pas coûter une lecture à
 * quelqu'un qui n'a rien obtenu.
 */
export function consommerLecture(state, maintenant = new Date()) {
  if (state.settings?.premium) return;
  const mois = moisCourant(maintenant);
  const memeMois = state.quota?.mois === mois;
  state.quota = {
    mois,
    lectures: (memeMois ? Number(state.quota.lectures) || 0 : 0) + 1,
  };
}

// --- Export et import ------------------------------------------------------

const FORMAT = 'jds.export';

/**
 * Le fichier qu'on emporte. Enveloppé et versionné : un export nu ne dit pas
 * de quelle appli ni de quelle époque il vient, et se relit mal des années
 * plus tard.
 */
export function exporter(state) {
  return {
    format: FORMAT,
    v: SCHEMA_DONNEES,
    exportedAt: Date.now(),
    state: {
      history: state.history,
      people: state.people,
      lastPlayers: state.lastPlayers,
    },
  };
}

/** Reconnaît un export, enveloppé ou non (les premiers ne l'étaient pas). */
function contenuDe(fichier) {
  if (!fichier || typeof fichier !== 'object') return null;
  if (fichier.format === FORMAT && fichier.state) return fichier.state;
  // Les tout premiers exports étaient l'état brut de l'appli.
  if (Array.isArray(fichier.history) || Array.isArray(fichier.people)) return fichier;
  return null;
}

function dateDe(enregistrement) {
  return Number(enregistrement?.updatedAt ?? enregistrement?.createdAt ?? 0) || 0;
}

/**
 * Fusionne une liste importée dans une liste locale, enregistrement par
 * enregistrement : à identifiant égal, la version la plus récemment modifiée
 * gagne. Une suppression est une modification comme une autre, donc effacer
 * sur un appareil puis importer un vieux fichier ne ressuscite rien.
 */
function fusionner(locaux, importes) {
  const par_id = new Map((locaux ?? []).map((x) => [x.id, x]));
  const bilan = { ajoutes: 0, remplaces: 0, ignores: 0 };

  for (const venu of importes ?? []) {
    if (!venu?.id) { bilan.ignores += 1; continue; }
    const ici = par_id.get(venu.id);
    if (!ici) {
      par_id.set(venu.id, venu);
      bilan.ajoutes += 1;
    } else if (dateDe(venu) > dateDe(ici)) {
      par_id.set(venu.id, venu);
      bilan.remplaces += 1;
    } else {
      bilan.ignores += 1;
    }
  }

  return { liste: [...par_id.values()], bilan };
}

/**
 * Applique un fichier d'export à l'état courant.
 *
 * Ni les réglages ni la partie en cours ne sont importés : la clé API et
 * l'adresse du serveur appartiennent à cet appareil-ci, et écraser une partie
 * commencée par celle d'un fichier ferait perdre la table en train de jouer.
 *
 * @returns {{ok: boolean, message?: string, parties?: object, joueurs?: object}}
 */
export function importer(fichier, state) {
  const contenu = contenuDe(fichier);
  if (!contenu) return { ok: false, message: "Ce fichier n'est pas un export de l'appli." };

  const propre = migrer({ ...clone(DEFAULT_STATE), ...contenu });
  const parties = fusionner(state.history, propre.history);
  const joueurs = fusionner(state.people, propre.people);

  // Les parties les plus anciennes d'abord, comme l'appli les attend.
  state.history = parties.liste.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  state.people = joueurs.liste;

  return { ok: true, parties: parties.bilan, joueurs: joueurs.bilan };
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
