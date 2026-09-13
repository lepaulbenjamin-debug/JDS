// Le moteur de la partie — « la régie ».
//
// Il tourne sur l'appareil qui a créé le salon, et lui seul. Les autres
// pupitres n'ont aucune logique de jeu : ils affichent l'état publié et
// renvoient des réponses. C'est ce qui permet au relais de rester bête.
//
// Le moteur ne sait pas ce qu'est un QCM, une estimation ou une rafale : il
// orchestre le temps, les scores et les jokers, et délègue à `manches/` tout ce
// qui dépend de la forme d'une manche. Ajouter un type de jeu ne demande donc
// pas d'y toucher.
//
// Aucun accès au réseau ni au DOM ici : on entre du temps et des réponses, on
// sort un état. `app.js` s'occupe de faire tourner la boucle.

import { repliqueDe, dureeDeLaReplique, annonceDeManche, paroleDe } from './emcee.js';
import { typeDeManche } from './manches/index.js';
import { filRougeTrouve } from './questions.js';

export const JOKERS = [
  {
    id: 'double', nom: 'Quitte ou double', emoji: '🎲',
    court: 'Le double, ou la moitié en moins',
    desc: 'Bonne réponse : points doublés. Mauvaise réponse : tu perds la moitié de ce que tu aurais gagné.',
  },
  {
    id: 'vol', nom: 'Vol', emoji: '🥷',
    court: 'Prend la moitié des points du leader',
    desc: 'Si tu as bon, tu prends la moitié des points que le leader gagne sur cette manche.',
  },
  {
    id: 'sabotage', nom: 'Sabotage', emoji: '🧨',
    court: 'Le leader ne marque rien',
    desc: 'Si tu as bon, le leader ne marque rien du tout sur cette manche.',
  },
  {
    id: 'sangfroid', nom: 'Sang-froid', emoji: '🧊',
    court: 'Le maximum, sans courir',
    desc: 'Prends tout ton temps : tu marques le maximum de points, comme si tu avais répondu du tac au tac.',
  },
  {
    id: 'cinquante', nom: '50/50', emoji: '✂️',
    court: 'Deux réponses en moins, points divisés',
    desc: 'Deux mauvaises réponses disparaissent — mais tes points de la manche sont divisés par deux.',
  },
];

/** Les jokers qu'un type de manche peut accueillir. */
export function jokersPossibles(type) {
  // Le 50/50 n'a rien à retirer ailleurs que sur un QCM : sur une estimation ou
  // une rafale, il n'y a pas de mauvaises réponses à masquer.
  return JOKERS.filter((j) => j.id !== 'cinquante' || type === 'qcm').map((j) => j.id);
}

// Le 50/50 se calcule sur le pupitre, pas ici : la banque de questions est
// embarquée dans la PWA, donc chaque appareil connaît déjà la bonne réponse et
// n'a besoin de rien demander à la régie. Retirer la solution de l'état publié
// reste utile — ça évite de l'avoir sous les yeux dans l'onglet réseau — mais
// ce n'est pas une protection : entre amis sur un canapé, la banque en local
// vaut mieux qu'un jeu qui s'arrête quand le Wi-Fi tombe.

// La fenêtre d'avant-question. C'est le temps de poser son verre, mais surtout
// le seul moment où l'on peut sortir un joker : on parie sans avoir vu
// l'énoncé. Un joker choisi la question sous les yeux n'est plus un pari, c'est
// une évidence — « je connais celle-là, je double ».
//
// Dix secondes et non six : il faut lire cinq intitulés qu'on ne connaît pas
// encore par cœur, se rappeler qui mène au classement, et décider. Six
// secondes suffisaient à taper sur un bouton, pas à choisir lequel.
export const DUREE_JOKERS_MS = 10000;
// Le sursis avant de clore une manche où tout le monde a répondu. C'est le
// temps laissé au dernier pour se raviser — et à celui qui a répondu trop vite
// pour rattraper son tap. Court : passé quelques secondes, la table attend.
export const DUREE_SURSIS_MS = 4000;
// Le temps de lire l'énoncé à voix haute, entre le top et l'ouverture des
// réponses. Les réponses apparaissaient en même temps que la question : on
// lisait la première case avant d'avoir entendu la fin de la phrase, et la
// voix de l'animateur ne servait plus à rien. Elle sert maintenant à quelque
// chose — on écoute, puis on répond, et le chrono ne part qu'à ce moment.
const PLANCHER_LECTURE_MS = 1500;
const RESPIRATION_LECTURE_S = 0.7;
// Le débit de l'animateur, en caractères par seconde. Sert quand aucun clip
// n'est disponible : la synthèse du navigateur parle elle aussi, et sa durée
// n'est connue de personne à l'avance.
const CARACTERES_PAR_SECONDE = 14;
// Le plancher de l'ouverture, pas sa durée : c'est la longueur du clip qui
// commande, et 5,5 s coupaient les 5,36 s de l'animateur classique — la lecture
// ne démarre qu'au battement suivant, et il faut bien la laisser finir.
const DUREE_INTRO_MS = 5500;
// Ce qui reste après la dernière syllabe de l'ouverture : le temps de couvrir
// le délai d'amorçage et de ne pas enchaîner sur la manche 1 au mot près.
const RESPIRATION_INTRO_S = 2;

/**
 * Le budget de l'ouverture, pour un clip d'une durée donnée.
 *
 * Exporté pour être mesuré et non recopié : la fenêtre réelle dépend du
 * manifeste audio, que le moteur ne sait lire que dans un navigateur. Un test
 * qui redirait la formule de son côté resterait vert le jour où elle change
 * ici — c'est-à-dire précisément le jour où il devrait crier.
 */
export const budgetDIntro = (clipS = 0) => Math.max(
  DUREE_INTRO_MS,
  Math.round((clipS + RESPIRATION_INTRO_S) * 1000),
);
// La révélation dure le temps de lire l'explication à voix haute : c'est elle
// qui transforme « tu as faux » en « ah bon, tiens », et c'est ce qui fait
// qu'on enchaîne une deuxième partie.
const DUREE_REVELATION_MS = 9500;
const DUREE_REVELATION_FINALE_MS = 11000;
// Un garde-fou contre un pack tiers aux explications interminables, pas une
// coupure de confort : il doit rester au-dessus de la plus longue révélation de
// la banque (≈ 34 s : commentaire + joker + réponse + explication). Le fixer en
// dessous, c'est couper l'animateur en pleine phrase — précisément ce qu'on
// cherche à éviter.
export const PLAFOND_REVELATION_MS = 40000;
const ABSENCES_AVANT_SOMMEIL = 2;      // au-delà, on n'attend plus ce pupitre

// La prime du fil rouge fond au fil de la partie : trouver à la deuxième manche
// relève du flair, trouver à la dixième relève de la patience.
const PRIME_FIL_DEPART = 2000;
const PRIME_FIL_DECROISSANCE = 150;
const PRIME_FIL_PLANCHER = 500;
const MANCHES_BLOQUEES_APRES_ERREUR = 2;

/**
 * Le coefficient de rapidité : 1 à l'instant zéro, 0,2 à la dernière seconde.
 *
 * `poids` dit combien la vitesse compte pour ce type de manche. À 1 on retrouve
 * le barème du QCM ; à 0 la rapidité ne joue plus aucun rôle, ce qu'il faut
 * pour une estimation où l'on veut que les gens réfléchissent.
 */
export function facteurDeRapidite(elapsedMs, dureeMs, poids = 1) {
  const ratio = Math.min(1, Math.max(0, elapsedMs / dureeMs));
  return 1 - poids * 0.8 * ratio;
}

/** Le barème d'un QCM, conservé tel quel : 100 % au top, 20 % à la fin. */
export function pointsDeRapidite(elapsedMs, dureeMs, base) {
  return Math.round(base * facteurDeRapidite(elapsedMs, dureeMs, 1));
}

/**
 * Résout une manche : qui a bon, qui marque quoi, et ce que les jokers changent.
 *
 * Fonction pure, exportée à part parce que c'est la règle du jeu — l'endroit
 * qu'on relit quand quelqu'un conteste un score en fin de soirée.
 */
export function resoudreManche({ manche, reponses, scores, joueurs, dureeMs, finale, persona }) {
  const base = finale ? 2000 : 1000;
  const type = typeDeManche(manche.type);
  const nomDe = (id) => joueurs.find((j) => j.id === id)?.name ?? '—';

  // Le leader *avant* la manche : c'est la cible par défaut du vol et du
  // sabotage, celle qu'on vise sans rien désigner. Choisir quelqu'un d'autre
  // reste possible — mais personne ne doit y être obligé en dix secondes, et
  // viser le premier est ce que fait la moitié de la table.
  const classement = joueurs
    .map((j) => ({ id: j.id, score: scores[j.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const leader = classement[0]?.score > 0 ? classement[0].id : null;

  // Le type note tout le monde d'un coup : certaines manches se jugent les unes
  // par rapport aux autres — au plus proche, par exemple.
  const notes = type.noter(manche, reponses);

  const detail = {};
  const gains = {};

  for (const joueur of joueurs) {
    const reponse = reponses[joueur.id];
    if (!reponse) {
      detail[joueur.id] = { absent: true, points: 0 };
      continue;
    }

    const note = notes[joueur.id] ?? { correct: false, fraction: 0 };
    // Le sang-froid neutralise le barème dégressif : on marque comme si la
    // réponse était partie à l'instant zéro.
    const vitesse = reponse.joker === 'sangfroid'
      ? 1
      : facteurDeRapidite(reponse.elapsedMs, dureeMs, type.poidsVitesse);
    const brut = Math.round(base * note.fraction * vitesse);
    let points = brut;

    if (reponse.joker === 'cinquante') points = Math.round(points / 2);
    if (reponse.joker === 'double') {
      points = note.correct ? brut * 2 : -Math.round(base * vitesse / 2);
    }

    gains[joueur.id] = points;
    detail[joueur.id] = {
      valeur: reponse.valeur,
      correct: note.correct,
      fraction: note.fraction,
      justes: note.justes,
      ecart: note.ecart,
      // Propres au mix : ce que la proposition a été reconnue être, et si
      // quelqu'un avait déjà pris ce titre — « juste mais trop tard » ne se
      // dit pas avec `correct: false` tout seul.
      titre: note.titre,
      dejaCite: note.dejaCite,
      niveau: note.niveau,
      elapsedMs: reponse.elapsedMs,
      joker: reponse.joker ?? null,
      points,
    };
  }

  const evenements = [];

  /** La victime d'un joker : celle qu'on a désignée, ou le premier au classement. */
  const viseePar = (id) => {
    const voulue = reponses[id]?.cible;
    if (voulue && voulue !== id && joueurs.some((j) => j.id === voulue)) return voulue;
    return leader && leader !== id ? leader : null;
  };

  /**
   * Les jokers à cible qui aboutissent : le plus rapide par victime.
   *
   * Deux joueurs qui volent la MÊME personne ne se partagent pas le butin — le
   * second ne trouverait plus rien à prendre et aurait grillé son joker pour
   * rien ; celui-là le récupère. Mais deux joueurs qui visent deux victimes
   * différentes réussissent tous les deux : depuis qu'on choisit sa cible, les
   * en empêcher reviendrait à punir celui qui n'a pas visé le même que le
   * voisin.
   */
  const parVictime = (nom) => {
    const candidats = Object.entries(detail)
      .filter(([, r]) => r.joker === nom && r.correct)
      .sort((a, b) => a[1].elapsedMs - b[1].elapsedMs);

    const retenus = new Map();               // victime → [id, note] le plus rapide
    for (const [id, r] of candidats) {
      const victime = viseePar(id);
      if (!victime) { r.jokerRendu = true; continue; }
      if (retenus.has(victime)) { r.jokerRendu = true; continue; }
      retenus.set(victime, [id, r]);
    }
    return retenus;
  };

  // Le vol passe avant le sabotage : le voleur prend sa part de ce que le leader
  // a gagné, puis le saboteur efface ce qu'il en reste. Les deux jokers se
  // cumulent donc sur une même manche, et c'est voulu.
  for (const [victime, [id, r]] of parVictime('vol')) {
    const pris = Math.round(Math.max(0, gains[victime] ?? 0) / 2);
    gains[victime] = (gains[victime] ?? 0) - pris;
    gains[id] += pris;
    r.vol = pris;
    r.cible = victime;
    evenements.push({
      type: 'vol',
      cle: 'vol',
      texte: repliqueDe(persona, 'vol', { nom: nomDe(id), cible: nomDe(victime), points: pris }),
    });
  }

  for (const [victime, [id, r]] of parVictime('sabotage')) {
    gains[victime] = Math.min(0, gains[victime] ?? 0);
    r.sabotage = victime;
    r.cible = victime;
    evenements.push({
      type: 'sabotage',
      cle: 'sabotage',
      texte: repliqueDe(persona, 'sabotage', { nom: nomDe(id), cible: nomDe(victime) }),
    });
  }

  // Un vol ou un sabotage tenté sur une mauvaise réponse est bel et bien perdu :
  // c'est le risque du pari, pris avant même d'avoir vu la question.

  for (const [id, r] of Object.entries(detail)) {
    if (r.joker !== 'double') continue;
    const cle = r.correct ? 'doubleReussi' : 'doubleRate';
    evenements.push({ type: 'double', cle, texte: repliqueDe(persona, cle, { nom: nomDe(id) }) });
  }

  // Report des gains. Un total ne descend jamais sous zéro : un joueur enfoncé
  // à moins mille décroche, et un jeu de soirée doit garder tout le monde en vie
  // jusqu'à la dernière manche.
  const nouveauxScores = { ...scores };
  for (const joueur of joueurs) {
    const gain = gains[joueur.id] ?? 0;
    detail[joueur.id].points = gain;
    nouveauxScores[joueur.id] = Math.max(0, (scores[joueur.id] ?? 0) + gain);
  }

  return { detail, scores: nouveauxScores, evenements, leaderAvant: leader };
}

/**
 * Le commentaire de la révélation.
 *
 * Rend aussi sa clé : c'est elle qui désigne le clip audio à jouer côté régie,
 * le texte affiché contenant des prénoms qu'aucun fichier pré-généré ne peut
 * prononcer. Le type de manche a son mot à dire — « personne n'a trouvé » ne
 * veut rien dire sur une estimation, où quelqu'un est forcément le plus proche.
 */
function commentaire({ detail, joueurs, manche, persona }) {
  const type = typeDeManche(manche.type);
  const nomDe = (id) => joueurs.find((j) => j.id === id)?.name ?? '—';
  const notes = Object.entries(detail).filter(([, r]) => !r.absent);
  const bonnes = notes.filter(([, r]) => r.correct);
  const reponse = type.solutionTexte(manche);

  const cle = type.cleCommentaire
    ? type.cleCommentaire(notes.map(([, r]) => r))
    : bonnes.length === 0 ? 'personne'
      : bonnes.length === 1 ? 'unSeul'
        : (bonnes.length === notes.length && notes.length > 1) ? 'tous'
          : 'plusieurs';

  // Qui la réplique doit nommer. Par défaut le premier de la liste, mais un
  // type peut avoir son propre héros : sur un « tu te mets combien ? », la
  // phrase parle de celui qui a osé le plus haut, pas du premier venu.
  const heros = type.heros?.(Object.entries(detail)) ?? bonnes[0]?.[0] ?? null;

  return {
    cle,
    texte: repliqueDe(persona, cle, {
      reponse,
      nb: bonnes.length,
      nom: heros ? nomDe(heros) : '',
    }),
  };
}

/**
 * Crée une régie. `manches` est déjà tiré et préparé, `dureeMs` est le temps de
 * référence laissé pour répondre — chaque type l'ajuste à sa façon.
 */
export function creerRegie({
  questions, dureeMs = 15000, persona = 'classique', themes = [], dureeRevelation,
  dureeLecture, jokers = JOKERS.map((j) => j.id), fil = null,
}) {
  const total = questions.length;

  // Les jokers retenus pour cette partie, dans l'ordre canonique. Une liste
  // vide est un mode à part entière — pas de filet, c'est le plus rapide qui
  // gagne — et non une erreur de réglage.
  const autorises = JOKERS.map((j) => j.id).filter((id) => jokers.includes(id));

  /** Le chrono d'une manche : un classement demande plus de temps qu'un tap. */
  const tempsDeReponse = (manche) => Math.round(dureeMs * typeDeManche(manche.type).facteurDuree);

  /**
   * Le temps de lire l'énoncé avant d'ouvrir les réponses.
   *
   * Deux sources, dans cet ordre : la durée du clip, que l'appli seule connaît
   * — les clips sont indexés sur des identifiants de banque, que le moteur
   * ignore — puis, à défaut, une estimation par la longueur du texte. Le repli
   * compte autant que le clip : sans banque, c'est la synthèse du navigateur qui
   * parle, et elle prend le même temps.
   *
   * Un TTMC fait exception, et c'est le seul : dix énoncés différents tournent
   * en même temps, l'animateur n'en lit aucun. Rien à attendre, donc.
   */
  const tempsDeLecture = (manche) => {
    if (manche.type === 'ttmc') return 0;
    const clip = dureeLecture?.(manche) ?? 0;
    const secondes = clip || (manche.texte ?? '').length / CARACTERES_PAR_SECONDE;
    return Math.max(PLANCHER_LECTURE_MS, Math.round((secondes + RESPIRATION_LECTURE_S) * 1000));
  };

  /**
   * Combien de temps laisser à l'ouverture.
   *
   * La longueur se lit dans emcee et non par un rappel de l'appli, contrairement
   * à la révélation : c'est une réplique de l'animateur, dont le moteur connaît
   * déjà la clé. Ce sont les clips de QUESTION qui lui échappent, parce qu'ils
   * sont indexés sur des identifiants de banque.
   */
  const tempsDIntro = () => budgetDIntro(dureeDeLaReplique(persona, 'ouverture'));

  /**
   * L'annonce, tirée une fois pour toute la table.
   *
   * Trois choses en sortent, et elles vont ensemble :
   *
   *   annonceClips  les clips à jouer, dans l'ordre
   *   annonceDite   ce que ces clips disent, mot pour mot
   *   annonce       la version écrite, qui peut nommer des joueurs et compter
   *                 des points — ce qu'aucun enregistrement ne saura faire
   *
   * Le tirage est ici, et pas sur chaque appareil, pour la même raison que le
   * reste du moteur : la régie décide, les pupitres appliquent. Tiré en local,
   * il donnait une phrase différente par téléphone, et une autre encore à
   * l'écran.
   *
   * `cleTexte` existe pour l'ouverture : il n'y a qu'un enregistrement, mais
   * deux versions écrites selon qu'on joue seul ou à plusieurs.
   */
  function poserLAnnonce(cle, {
    numero = 0, variables = {}, cleTexte = cle, complementaire = false,
  } = {}) {
    const dite = annonceDeManche(persona, cle, numero);
    etat.annonceCle = cle;
    etat.annonceClips = dite.clips;
    // Laissé vide quand l'écrit COMPLÈTE l'enregistrement au lieu de le
    // répéter : au podium, le clip renvoie explicitement à l'écran — « le
    // classement final est à l'écran » — et c'est l'écran qui nomme le gagnant
    // et son score. Là, deux textes différents ne se contredisent pas, ils se
    // répondent. Partout ailleurs, l'écrit doit être le mot pour mot de ce
    // qu'on entend.
    etat.annonceDite = complementaire ? '' : dite.texte;
    etat.annonce = repliqueDe(persona, cleTexte, variables);
  }

  /**
   * Combien de temps laisser sur la révélation.
   *
   * Le plancher suffit quand l'animateur ne fait que commenter, mais dès qu'il
   * lit la bonne réponse et son explication, une durée fixe couperait la fin de
   * la phrase — et la fin de la phrase, c'est justement le « ah bon, tiens » qui
   * fait la valeur de la manche. `dureeRevelation` est fourni par l'appli, qui
   * seule connaît la longueur des clips.
   *
   * On lui passe le résultat, et pas seulement la question : l'animateur dit
   * aussi son commentaire et, s'il s'en est passé une, la réplique de l'action
   * marquante. Ne budgéter que la réponse et l'explication coupait la phrase
   * dès qu'un joker sortait — c'est-à-dire à toutes les manches où il se passe
   * justement quelque chose.
   */
  const tempsDeRevelation = (manche, finale, resultat) => {
    const plancher = finale ? DUREE_REVELATION_FINALE_MS : DUREE_REVELATION_MS;
    const audio = Math.min(dureeRevelation?.(manche, resultat) ?? 0, PLAFOND_REVELATION_MS);
    return Math.max(plancher, audio);
  };

  const etat = {
    phase: 'lobby',
    manche: 0,
    total,
    themes,
    persona,
    dureeMs,
    startAt: 0,
    reponsesAt: 0,
    niveaux: {},
    candidats: null,
    votes: {},
    valides: null,
    deadline: 0,
    finPhase: 0,
    introAt: 0,
    question: null,
    annonce: '',
    annonceCle: '',
    resultat: null,
    podium: null,
    scores: {},
    jokers: {},          // id → jokers déjà consommés
    absences: {},        // id → manches consécutives sans réponse
    reponses: {},        // manche en cours seulement
    // Le fil rouge est le seul état qui traverse les manches.
    // Plusieurs personnes peuvent démasquer le fil : `trouves` les garde dans
    // l'ordre où elles ont trouvé, `annonces` retient combien ont déjà été dites
    // à voix haute.
    fil: fil ? { id: fil.id, trouves: [], bloques: {}, annonces: 0 } : null,
  };

  const jokersRestants = (id) => autorises
    .filter((j) => !(etat.jokers[id] ?? []).includes(j));

  const classement = (joueurs) => joueurs
    .map((j) => ({ id: j.id, name: j.name, score: etat.scores[j.id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr'));

  /**
   * Une tentative sur le fil rouge. Elle peut tomber à n'importe quel moment de
   * la partie, y compris pendant une révélation : c'est une course parallèle,
   * pas une réponse de manche.
   */
  function tenterLeFil(playerId, propose) {
    if (!etat.fil) return false;
    // On ne touche la prime qu'une fois — mais le fil reste ouvert aux autres :
    // la course ne s'arrête pas au premier, sinon toute la table cherche pour
    // rien dès qu'un joueur rapide a trouvé.
    if (etat.fil.trouves.some((t) => t.playerId === playerId)) return false;
    if ((etat.fil.bloques[playerId] ?? 0) > etat.manche) return false;

    if (!filRougeTrouve(fil, propose)) {
      // Se tromper coûte deux manches de silence : sans ça, on tape tous les
      // mots du dictionnaire jusqu'à tomber juste.
      etat.fil.bloques[playerId] = etat.manche + MANCHES_BLOQUEES_APRES_ERREUR;
      return true;
    }

    const prime = Math.max(
      PRIME_FIL_PLANCHER,
      PRIME_FIL_DEPART - PRIME_FIL_DECROISSANCE * Math.max(0, etat.manche - 1),
    );
    etat.scores[playerId] = (etat.scores[playerId] ?? 0) + prime;
    etat.fil.trouves.push({ playerId, manche: etat.manche, prime });
    return true;
  }

  /** Les règles d'annonce du type en cours, s'il en a. */
  function pariDeLaManche() {
    return etat.question ? typeDeManche(etat.question.type).paris ?? null : null;
  }

  /**
   * L'annonce de niveau, avant de voir sa question.
   *
   * Le verrou réel est côté pupitre : c'est lui qui n'affiche l'énoncé qu'une
   * fois la fenêtre passée. Ici on vérifie seulement qu'on ne change pas son
   * pari APRÈS avoir répondu — le reste relève de la même limite que le 50/50,
   * à savoir qu'un appareil de la table a de toute façon la banque en local.
   */
  function poserLePari(playerId, round, niveau) {
    const regles = pariDeLaManche();
    if (!regles) return false;
    if (etat.phase !== 'manche' || round !== etat.manche) return false;
    if (etat.reponses[playerId]) return false;

    const propre = Math.min(regles.max, Math.max(regles.min, Math.round(Number(niveau))));
    if (!Number.isFinite(propre)) return false;
    if (etat.niveaux[playerId] === propre) return false;

    etat.niveaux[playerId] = propre;
    return true;
  }

  function prepareManche(numero, now) {
    etat.manche = numero;
    etat.question = questions[numero - 1];
    etat.reponses = {};
    etat.niveaux = {};
    etat.resultat = null;
    etat.phase = 'manche';
    // La fenêtre d'avant-question appartient au type : le TTMC y fait annoncer
    // un niveau, ce qui demande plus que le temps de sortir un joker.
    etat.startAt = now + (typeDeManche(etat.question.type).avantQuestionMs ?? DUREE_JOKERS_MS);
    etat.reponsesAt = etat.startAt + tempsDeLecture(etat.question);
    etat.deadline = etat.reponsesAt + tempsDeReponse(etat.question);
    etat.finPhase = etat.deadline;
    poserLAnnonce(numero === total ? 'derniereManche' : 'avantManche', {
      numero,
      variables: { manche: numero, total },
    });
  }

  /**
   * Le passage de la révélation : les clips dans l'ordre, et leur mot pour mot.
   *
   * Quatre choses s'enchaînent — le commentaire, l'action marquante s'il y en a
   * eu une, la bonne réponse, son explication. Les deux premières sont des
   * répliques de l'animateur, les deux dernières appartiennent à la question.
   *
   * Tout est décidé ici pour la même raison qu'ailleurs : tiré sur chaque
   * appareil, le sort donnait une phrase par téléphone, et une autre encore à
   * l'écran.
   *
   * Le TTMC n'a ni réponse ni explication enregistrées, et c'est normal : dix
   * corrections tournent en même temps, chacune sur son écran. Les réclamer
   * quand même rendait la révélation entièrement MUETTE — un clip manquant fait
   * abandonner tout le passage, plutôt que de mélanger deux timbres dans une
   * même phrase. D'où le test sur la solution, et non sur l'identifiant.
   */
  function paroleDeLaTable(commentaireCle, evenements) {
    const clips = [];
    const dit = paroleDe(persona, commentaireCle);
    if (dit) clips.push(dit.id);

    const marquant = evenements?.[0];
    const ditMarquant = marquant?.cle ? paroleDe(persona, marquant.cle) : null;
    if (ditMarquant) clips.push(ditMarquant.id);

    const type = typeDeManche(etat.question.type);
    if (etat.question.id && type.solutionTexte(etat.question)) {
      clips.push(`reponse/${etat.question.id}`, `note/${etat.question.id}`);
    }

    return {
      clips,
      commentaireDit: dit?.texte ?? '',
      evenementDit: ditMarquant?.texte ?? '',
    };
  }

  // Le temps laissé à la table pour trancher. Court : c'est un réflexe, pas une
  // délibération, et l'écran de révélation attend derrière.
  const DUREE_VOTE_MS = 12000;

  /**
   * Les propositions que l'appli n'a pas reconnues, et qu'elle soumet à la table.
   *
   * La limite du mix était assumée depuis le début : le jeu juge sur une liste,
   * il ne connaît pas toute la musique du monde. Quelqu'un qui répond « Karma
   * Police » sur « une chanson avec un métier dans le titre » a raison, et se
   * faisait refuser. Personne autour de la table n'a ce problème — d'où ce
   * passage de relais : ce que la machine ne sait pas, la salle le sait.
   *
   * Seules les manches de mix en ouvrent une, et seulement s'il y a quelque
   * chose à juger. Ajouter un écran de vote pour rien serait le meilleur moyen
   * de casser le rythme de la soirée.
   */
  function aSoumettreAuVote(joueurs) {
    if (etat.question?.type !== 'mix') return [];
    const type = typeDeManche('mix');
    const notes = type.noter(etat.question, etat.reponses);
    return Object.entries(etat.reponses)
      .filter(([id, r]) => r.valeur && !notes[id]?.correct && !notes[id]?.dejaCite)
      .map(([id, r]) => ({
        playerId: id,
        nom: joueurs.find((j) => j.id === id)?.name ?? '—',
        titre: String(r.valeur).slice(0, 80),
      }));
  }

  /**
   * Le verdict de la table, appliqué avant de compter les points.
   *
   * Un titre validé rejoint la liste des réponses acceptées DE CETTE MANCHE, et
   * rien d'autre ne bouge : le barème, l'ordre d'arrivée, la règle du titre déjà
   * pris continuent de s'appliquer tels quels. C'est ce qui garde le vote
   * inoffensif — il élargit ce que le jeu reconnaît, il ne change pas comment il
   * compte.
   *
   * Majorité des votants, l'auteur exclu : on ne vote pas pour soi-même.
   * Personne n'a voté sur une proposition ? Elle est refusée — le silence n'est
   * pas une approbation, sinon une table distraite validerait tout.
   */
  function appliquerLeVote() {
    const acceptes = [];
    for (const candidat of etat.candidats ?? []) {
      const bulletins = Object.values(etat.votes?.[candidat.playerId] ?? {});
      const oui = bulletins.filter(Boolean).length;
      if (bulletins.length && oui * 2 > bulletins.length) {
        acceptes.push(candidat.titre);
        etat.question.acceptees = [...etat.question.acceptees, { titre: candidat.titre, parLaTable: true }];
      }
    }
    return acceptes;
  }

  /**
   * Un bulletin. Rend `true` si l'état a bougé — la régie ne republie que dans
   * ce cas, et un vote qui n'apparaît pas tout de suite se retape.
   *
   * On refuse celui de l'auteur : voter pour sa propre proposition n'est pas un
   * jugement. Et on n'accepte un bulletin que pendant la phase de vote, sinon un
   * pupitre en retard corrigerait un résultat déjà annoncé.
   */
  function enregistrerLeVote(playerId, vote) {
    if (etat.phase !== 'vote' || !playerId) return false;
    const cible = String(vote.candidat ?? '');
    if (cible === playerId) return false;
    if (!etat.candidats?.some((c) => c.playerId === cible)) return false;

    const bulletins = etat.votes[cible] ?? (etat.votes[cible] = {});
    const oui = Boolean(vote.oui);
    if (bulletins[playerId] === oui) return false;
    bulletins[playerId] = oui;
    return true;
  }

  function cloreManche(joueurs, now) {
    const candidats = aSoumettreAuVote(joueurs);
    // Personne d'autre que les auteurs autour de la table : il n'y a personne
    // pour juger, et se voter soi-même n'aurait aucun sens. On tranche comme
    // avant, sur la liste.
    const votants = joueurs.filter((j) => !candidats.some((c) => c.playerId === j.id));
    if (candidats.length && votants.length) {
      etat.phase = 'vote';
      etat.candidats = candidats;
      etat.votes = {};
      etat.valides = null;
      etat.finPhase = now + DUREE_VOTE_MS;
      return;
    }
    resoudreLaManche(joueurs, now);
  }

  function resoudreLaManche(joueurs, now) {
    const finale = etat.manche === total;
    const { detail, scores, evenements } = resoudreManche({
      manche: etat.question,
      reponses: etat.reponses,
      scores: etat.scores,
      joueurs,
      dureeMs: tempsDeReponse(etat.question),
      finale,
      persona,
    });

    for (const joueur of joueurs) {
      const r = detail[joueur.id];
      etat.absences[joueur.id] = r?.absent ? (etat.absences[joueur.id] ?? 0) + 1 : 0;
      // Un joker rendu n'est pas consommé : il n'a rien pu faire, faute de
      // cible ou parce que quelqu'un a été plus rapide sur le même coup.
      const joker = r?.jokerRendu ? null : r?.joker;
      if (joker) etat.jokers[joueur.id] = [...(etat.jokers[joueur.id] ?? []), joker];
    }

    etat.scores = scores;

    // Les fils démasqués depuis la dernière révélation s'annoncent ici, chacun
    // une seule fois. Le mot, lui, n'est jamais dit : les autres cherchent
    // encore, et l'annoncer mettrait fin à la course pour toute la table.
    const nouveauxFils = (etat.fil?.trouves ?? []).slice(etat.fil?.annonces ?? 0);
    if (nouveauxFils.length) {
      etat.fil.annonces = etat.fil.trouves.length;
      evenements.unshift(...nouveauxFils.map((trouve) => ({
        type: 'fil',
        cle: 'filTrouve',
        texte: `${joueurs.find((j) => j.id === trouve.playerId)?.name ?? '—'}`
          + ` a trouvé le fil rouge. ${trouve.prime} points.`,
      })));
    }

    // Le plus rapide parmi ceux qui ont trouvé : c'est la ligne qui donne envie
    // de répondre vite plutôt que de répondre sûr.
    const bonnes = Object.entries(detail)
      .filter(([, r]) => r.correct)
      .sort((a, b) => a[1].elapsedMs - b[1].elapsedMs);
    const rapide = bonnes[0];
    const tete = classement(joueurs)[0];

    const mot = commentaire({ detail, joueurs, manche: etat.question, persona });

    etat.phase = 'revelation';
    etat.resultat = {
      detail,
      evenements,
      commentaire: mot.texte,
      commentaireCle: mot.cle,
      // Ce que l'animateur va dire, tiré ici et publié : voir `paroleDeLaTable`.
      ...paroleDeLaTable(mot.cle, evenements),
      rapide: rapide
        ? {
            nom: joueurs.find((j) => j.id === rapide[0])?.name ?? '—',
            secondes: (rapide[1].elapsedMs / 1000).toFixed(1).replace('.', ','),
          }
        : null,
      leader: tete && tete.score > 0 ? { nom: tete.name, points: tete.score } : null,
    };
    etat.finPhase = now + tempsDeRevelation(etat.question, finale, etat.resultat);
  }

  return {
    get phase() {
      return etat.phase;
    },

    /** Le lobby se ferme, l'animateur ouvre la soirée. */
    lancer(now, joueurs) {
      if (etat.phase !== 'lobby') return false;
      etat.phase = 'intro';
      // Retenu pour pouvoir recalculer la fin : voir `avancer`.
      etat.introAt = now;
      etat.finPhase = now + tempsDIntro();
      // Un seul enregistrement d'ouverture, quel que soit le nombre de joueurs :
      // il ne compte personne, faute de savoir combien vous serez. La version
      // écrite, elle, se décline — elle compte les candidats, et à un seul elle
      // ne veut plus rien dire.
      poserLAnnonce('ouverture', {
        variables: { nb: joueurs.length },
        cleTexte: joueurs.length === 1 ? 'ouvertureSolo' : 'ouverture',
      });
      return true;
    },

    /**
     * Couper court à la révélation.
     *
     * La durée est calculée pour laisser l'explication se dire en entier, plus
     * une respiration : c'est le bon défaut, et c'est parfois trop. Une question
     * que tout le monde connaissait, une table qui a fini de lire, et l'écran
     * reste là pendant quinze secondes.
     *
     * Avancer la fin de phase suffit — le battement suivant enchaîne, en
     * passant par le chemin ordinaire. On ne la recule jamais : rallonger une
     * phase ramènerait un écran que la table a déjà quitté des yeux.
     */
    passer(now) {
      if (etat.phase !== 'revelation' || etat.finPhase <= now) return false;
      etat.finPhase = now;
      return true;
    },

    /**
     * Range ce qui arrive du relais : les réponses de la manche en cours, et les
     * tentatives sur le fil rouge, qui elles ne dépendent d'aucune manche.
     *
     * Une réponse hors manche est jetée sans bruit — c'est le cas normal d'un
     * pupitre qui a tapé juste après la fin du chrono.
     */
    encaisser(entrees) {
      let nouvelle = false;

      for (const entree of entrees ?? []) {
        if (typeof entree.fil === 'string') {
          if (tenterLeFil(entree.playerId, entree.fil)) nouvelle = true;
          continue;
        }

        // Un bulletin sur une proposition soumise à la table.
        if (entree.vote) {
          if (enregistrerLeVote(entree.playerId, entree.vote)) nouvelle = true;
          continue;
        }

        if (entree.niveau != null) {
          if (poserLePari(entree.playerId, entree.round, entree.niveau)) nouvelle = true;
          continue;
        }

        if (etat.phase !== 'manche' || entree.round !== etat.manche) continue;

        const valeur = typeDeManche(etat.question.type).lire(entree.reponse);
        if (valeur == null) continue;

        // On garde la DERNIÈRE réponse reçue, pas la première : tant que le
        // chrono tourne, on a le droit de changer d'avis. Le temps retenu est
        // celui du dernier geste — sinon il suffirait de taper au hasard à la
        // première seconde pour s'acheter la prime de rapidité, puis de
        // corriger tranquillement.
        etat.reponses[entree.playerId] = {
          valeur,
          elapsedMs: entree.elapsedMs,
          // Le niveau annoncé pendant la fenêtre, ou le plancher pour qui n'a
          // rien dit. C'est lui qui décide de ce que vaut la manche.
          ...(pariDeLaManche() ? { niveau: etat.niveaux[entree.playerId] ?? pariDeLaManche().defaut } : {}),
          // Un joker écarté des réglages est ignoré, même si un pupitre bricolé
          // en renvoie un : le réglage de la partie fait loi ici, pas là-bas.
          joker: autorises.includes(entree.joker) ? entree.joker : null,
          // Qui l'on vise, quand le joker vise quelqu'un. Vide : le premier au
          // classement, comme avant — c'est ce que fait la moitié de la table,
          // et personne ne doit être forcé de choisir en dix secondes.
          cible: typeof entree.cible === 'string' ? entree.cible : null,
        };
        nouvelle = true;
      }
      return nouvelle;
    },

    /** Fait avancer l'horloge. Renvoie `true` si l'état publié doit changer. */
    avancer(now, joueurs) {
      if (etat.phase === 'lobby' || etat.phase === 'podium') return false;

      if (etat.phase === 'intro') {
        // Recalculée à chaque battement, et pas seulement au lancement : en
        // solo la partie démarre au premier tap, avant que le manifeste audio
        // ne soit lu. La longueur du clip vaut alors zéro, et l'ouverture se
        // faisait couper par la manche 1. La durée ne peut que s'allonger —
        // une fois la banque connue, elle ne change plus.
        etat.finPhase = etat.introAt + tempsDIntro();
        if (now >= etat.finPhase) {
          prepareManche(1, now);
          return true;
        }
        return false;
      }

      // Le vote se ferme au chrono, ou dès que tout le monde s'est prononcé
      // sur tout : rien à attendre quand la table a fini de trancher.
      if (etat.phase === 'vote') {
        const votants = joueurs.filter((j) => !etat.candidats.some((c) => c.playerId === j.id));
        const complet = etat.candidats.every((c) =>
          votants.every((j) => etat.votes?.[c.playerId]?.[j.id] !== undefined));
        if (now >= etat.finPhase || (votants.length && complet)) {
          etat.valides = appliquerLeVote();
          resoudreLaManche(joueurs, now);
          return true;
        }
        return false;
      }

      if (etat.phase === 'manche') {
        // On n'attend pas la fin du chrono si tout le monde a déjà répondu — et
        // on n'attend pas non plus un pupitre parti se chercher à boire depuis
        // deux manches.
        //
        // Mais on ne clôt pas dans la seconde du dernier tap : puisqu'une
        // réponse se change tant que le chrono tourne, fermer aussitôt
        // reviendrait à ne jamais laisser personne se raviser — le plus lent de
        // la table déciderait pour tous, sans le savoir. D'où le sursis :
        // quelques secondes sans que personne ne touche à rien.
        const attendus = joueurs.filter((j) => (etat.absences[j.id] ?? 0) < ABSENCES_AVANT_SOMMEIL);
        const dernierGeste = attendus.reduce((tard, j) => {
          const reponse = etat.reponses[j.id];
          return reponse ? Math.max(tard, etat.reponsesAt + (reponse.elapsedMs ?? 0)) : tard;
        }, etat.reponsesAt);
        const tousRepondu = attendus.length > 0
          && attendus.every((j) => etat.reponses[j.id])
          && now >= etat.reponsesAt
          && now >= dernierGeste + DUREE_SURSIS_MS;
        if (now >= etat.deadline || tousRepondu) {
          cloreManche(joueurs, now);
          return true;
        }
        return false;
      }

      if (etat.phase === 'revelation' && now >= etat.finPhase) {
        if (etat.manche < total) {
          prepareManche(etat.manche + 1, now);
        } else {
          const podium = classement(joueurs);
          etat.phase = 'podium';
          etat.question = null;
          etat.resultat = null;
          poserLAnnonce('podium', {
            complementaire: true,
            variables: { nom: podium[0]?.name ?? '', points: podium[0]?.score ?? 0 },
          });
          if (!podium[0]) etat.annonce = '';
          etat.podium = podium;
        }
        return true;
      }

      return false;
    },

    /**
     * L'état tel qu'il part sur le relais. La solution et l'explication n'y
     * figurent qu'à partir de la révélation : tant que le chrono tourne, elles
     * ne sont sur aucun autre appareil que celui-ci.
     */
    etatPublic(joueurs) {
      const revele = etat.phase === 'revelation';
      const type = etat.question && typeDeManche(etat.question.type);
      const question = etat.question && {
        id: etat.question.id,
        type: type.id,
        theme: etat.question.theme,
        texte: etat.question.texte,
        consigne: type.consigne,
        ...type.publier(etat.question, revele),
        // `solutionTexte` et non `solution` : la seconde appartient à la manche
        // et porte sa forme à elle — un tableau de booléens pour une rafale, un
        // ordre d'éléments pour un classement. Écrire la phrase lisible sous le
        // même nom l'écrasait, et le pupitre se retrouvait à lire une chaîne
        // caractère par caractère : toutes les cases « Vrai » passaient au vert,
        // et aucun rang n'était jamais juste.
        ...(revele ? { note: etat.question.note, solutionTexte: type.solutionTexte(etat.question) } : {}),
      };

      return {
        phase: etat.phase,
        manche: etat.manche,
        total,
        themes: etat.themes,
        persona,
        dureeMs: etat.question ? tempsDeReponse(etat.question) : dureeMs,
        startAt: etat.startAt,
        // Le moment où les réponses s'ouvrent : après l'énoncé, pas avant.
        reponsesAt: etat.reponsesAt,
        deadline: etat.deadline,
        finPhase: etat.finPhase,
        // La clé dit de quelle annonce il s'agit ; les clips sont tirés une
        // seule fois, ici, pour que toute la table entende la même chose.
        annonceCle: etat.annonceCle,
        annonceClips: etat.annonceClips ?? [],
        finale: etat.manche === total,
        question,
        // `annonceDite` est le mot pour mot des clips — c'est lui qui s'affiche
        // quand ils sont là. `annonce` est la version écrite, qui porte les
        // prénoms et les points : le repli de la synthèse, et le texte du
        // podium.
        // Les propositions soumises à la table, et les bulletins déjà tombés.
        // Le détail des votants est public : autour d'une table, on voit très
        // bien qui lève la main.
        candidats: etat.phase === 'vote' ? etat.candidats : null,
        votes: etat.phase === 'vote' ? etat.votes : null,
        // Ce que la table a validé, dit à la révélation.
        valides: etat.valides ?? null,
        annonceDite: etat.annonceDite ?? '',
        annonce: etat.annonce,
        resultat: etat.resultat,
        podium: etat.podium ?? null,
        classement: classement(joueurs),
        jokersActifs: autorises.filter((j) => !etat.question || jokersPossibles(type.id).includes(j)),
        jokers: Object.fromEntries(joueurs.map((j) => [j.id, jokersRestants(j.id)])),
        // Sert au pupitre à afficher « 3 sur 5 ont répondu » sans révéler quoi.
        ontRepondu: Object.keys(etat.reponses),
        // Les niveaux annoncés sont publics, et c'est voulu : au TTMC de
        // plateau on annonce à voix haute, et « Ana s'est mise à 9 » est la
        // moitié du plaisir de la manche.
        niveaux: etat.niveaux ?? {},
        fil: etat.fil && {
          indice: fil.indice,
          // Le mot ne part qu'à la toute fin. Il partait jusqu'ici dès qu'une
          // personne avait trouvé — et comme l'état est le même pour tous, cela
          // le servait à la table entière : la course s'arrêtait au premier, et
          // les autres n'avaient plus qu'à recopier.
          solution: etat.phase === 'podium' ? fil.solution : undefined,
          revelation: etat.phase === 'podium' ? fil.revelation : undefined,
          trouves: etat.fil.trouves.map((trouve) => ({
            id: trouve.playerId,
            nom: joueurs.find((j) => j.id === trouve.playerId)?.name ?? '—',
            manche: trouve.manche,
            prime: trouve.prime,
          })),
          bloques: etat.fil.bloques,
        },
      };
    },
  };
}
