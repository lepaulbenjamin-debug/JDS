// Le moteur de la partie — « la régie ».
//
// Il tourne sur l'appareil qui a créé le salon, et lui seul. Les autres
// pupitres n'ont aucune logique de jeu : ils affichent l'état publié et
// renvoient des réponses. C'est ce qui permet au relais de rester bête, et
// c'est aussi ce qui garantit qu'un pupitre bricolé ne peut pas s'attribuer
// des points — il n'a même pas la bonne réponse avant la révélation.
//
// Aucun accès au réseau ni au DOM ici : on entre du temps et des réponses, on
// sort un état. `app.js` s'occupe de faire tourner la boucle.

import { repliqueDe } from './emcee.js';

export const JOKERS = [
  {
    id: 'double', nom: 'Quitte ou double', emoji: '🎲',
    desc: 'Bonne réponse : points doublés. Mauvaise réponse : tu perds la moitié de ce que tu aurais gagné.',
  },
  {
    id: 'vol', nom: 'Vol', emoji: '🥷',
    desc: 'Si tu as bon, tu prends la moitié des points que le leader gagne sur cette manche.',
  },
  {
    id: 'sabotage', nom: 'Sabotage', emoji: '🧨',
    desc: 'Si tu as bon, le leader ne marque rien du tout sur cette manche.',
  },
  {
    id: 'sangfroid', nom: 'Sang-froid', emoji: '🧊',
    desc: 'Prends tout ton temps : tu marques le maximum de points, comme si tu avais répondu du tac au tac.',
  },
  {
    id: 'cinquante', nom: '50/50', emoji: '✂️',
    desc: 'Deux mauvaises réponses disparaissent — mais tes points de la manche sont divisés par deux.',
  },
];

// Le 50/50 se calcule sur le pupitre, pas ici : la banque de questions est
// embarquée dans la PWA, donc chaque appareil connaît déjà la bonne réponse et
// n'a besoin de rien demander à la régie. Retirer `bonne` de l'état publié
// reste utile — ça évite de l'avoir sous les yeux dans l'onglet réseau — mais
// ce n'est pas une protection : entre amis sur un canapé, la banque en local
// vaut mieux qu'un jeu qui s'arrête quand le Wi-Fi tombe.
//
// Si la banque partait un jour sur un serveur, ce joker devrait changer de
// camp : ce serait alors à la régie de publier un masque par joueur.

// La fenêtre d'avant-question. C'est le temps de poser son verre, mais surtout
// le seul moment où l'on peut sortir un joker : on parie sans avoir vu
// l'énoncé. Un joker choisi la question sous les yeux n'est plus un pari, c'est
// une évidence — « je connais celle-là, je double ».
export const DUREE_JOKERS_MS = 6000;
const DUREE_INTRO_MS = 5500;
// La révélation dure le temps de lire l'explication à voix haute : c'est elle
// qui transforme « tu as faux » en « ah bon, tiens », et c'est ce qui fait
// qu'on enchaîne une deuxième partie.
const DUREE_REVELATION_MS = 9500;
const DUREE_REVELATION_FINALE_MS = 11000;
const PLAFOND_REVELATION_MS = 22000;   // au-delà, l'explication casse le rythme
const ABSENCES_AVANT_SOMMEIL = 2;         // au-delà, on n'attend plus ce pupitre

/** Barème dégressif : 100 % à l'instant zéro, 20 % à la dernière seconde. */
export function pointsDeRapidite(elapsedMs, dureeMs, base) {
  const ratio = Math.min(1, Math.max(0, elapsedMs / dureeMs));
  return Math.round(base * (1 - 0.8 * ratio));
}

/**
 * Résout une manche : qui a bon, qui marque quoi, et ce que les jokers changent.
 *
 * Fonction pure, exportée à part parce que c'est la règle du jeu — l'endroit
 * qu'on relit quand quelqu'un conteste un score en fin de soirée.
 */
export function resoudreManche({ question, reponses, scores, joueurs, dureeMs, finale, persona }) {
  const base = finale ? 2000 : 1000;
  const nomDe = (id) => joueurs.find((j) => j.id === id)?.name ?? '—';

  // Le leader *avant* la manche : c'est lui que visent le vol et le sabotage.
  // Automatiquement, sans écran de sélection de cible — un joker qui demande de
  // désigner quelqu'un coûte trois secondes que la manche n'a pas, et viser le
  // premier est de toute façon ce que tout le monde ferait.
  const classement = joueurs
    .map((j) => ({ id: j.id, score: scores[j.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const leader = classement[0]?.score > 0 ? classement[0].id : null;

  const detail = {};
  const gains = {};

  for (const joueur of joueurs) {
    const reponse = reponses[joueur.id];
    if (!reponse) {
      detail[joueur.id] = { absent: true, points: 0 };
      continue;
    }
    const correct = reponse.choice === question.bonne;
    // Le sang-froid neutralise le barème dégressif : on marque comme si la
    // réponse était partie à l'instant zéro.
    const brut = reponse.joker === 'sangfroid'
      ? base
      : pointsDeRapidite(reponse.elapsedMs, dureeMs, base);
    let points = correct ? brut : 0;

    if (reponse.joker === 'cinquante' && correct) points = Math.round(points / 2);
    if (reponse.joker === 'double') points = correct ? brut * 2 : -Math.round(brut / 2);

    gains[joueur.id] = points;
    detail[joueur.id] = {
      choix: reponse.choice,
      correct,
      elapsedMs: reponse.elapsedMs,
      joker: reponse.joker ?? null,
      points,
    };
  }

  const evenements = [];

  /**
   * Un seul vol, un seul sabotage par manche — le plus rapide à avoir trouvé.
   *
   * Trois joueurs qui volent le même leader ne se partagent pas le butin : le
   * deuxième et le troisième ne trouveraient plus rien à prendre et auraient
   * grillé leur joker pour rien. Ceux-là le récupèrent donc, plutôt que de le
   * perdre au profit de quelqu'un qui a simplement tapé plus vite.
   */
  const premierAvoirJoue = (nom) => {
    const candidats = Object.entries(detail)
      .filter(([, r]) => r.joker === nom && r.correct)
      .sort((a, b) => a[1].elapsedMs - b[1].elapsedMs);

    const gagnant = candidats.find(([id]) => leader && leader !== id) ?? null;
    for (const [, r] of candidats) if (r !== gagnant?.[1]) r.jokerRendu = true;
    // Sans cible, personne ne consomme quoi que ce soit.
    if (!gagnant) return null;
    return gagnant;
  };

  // Le vol passe avant le sabotage : le voleur prend sa part de ce que le leader
  // a gagné, puis le saboteur efface ce qu'il en reste. Les deux jokers se
  // cumulent donc sur une même manche, et c'est voulu.
  const voleur = premierAvoirJoue('vol');
  if (voleur) {
    const [id, r] = voleur;
    const pris = Math.round(Math.max(0, gains[leader] ?? 0) / 2);
    gains[leader] = (gains[leader] ?? 0) - pris;
    gains[id] += pris;
    r.vol = pris;
    evenements.push({
      type: 'vol',
      cle: 'vol',
      texte: repliqueDe(persona, 'vol', { nom: nomDe(id), cible: nomDe(leader), points: pris }),
    });
  }

  const saboteur = premierAvoirJoue('sabotage');
  if (saboteur) {
    const [id, r] = saboteur;
    gains[leader] = Math.min(0, gains[leader] ?? 0);
    r.sabotage = leader;
    evenements.push({
      type: 'sabotage',
      cle: 'sabotage',
      texte: repliqueDe(persona, 'sabotage', { nom: nomDe(id), cible: nomDe(leader) }),
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
 * prononcer.
 */
function commentaire({ detail, joueurs, question, persona }) {
  const nomDe = (id) => joueurs.find((j) => j.id === id)?.name ?? '—';
  const bonnes = Object.entries(detail).filter(([, r]) => r.correct);
  const reponse = question.reponses[question.bonne];
  const repondants = Object.values(detail).filter((r) => !r.absent).length;

  const cle = bonnes.length === 0 ? 'personne'
    : bonnes.length === 1 ? 'unSeul'
      : (bonnes.length === repondants && repondants > 1) ? 'tous'
        : 'plusieurs';

  return {
    cle,
    texte: repliqueDe(persona, cle, {
      reponse,
      nb: bonnes.length,
      nom: bonnes.length === 1 ? nomDe(bonnes[0][0]) : '',
    }),
  };
}

/**
 * Crée une régie. `questions` est déjà tiré et mélangé, `dureeMs` est le temps
 * laissé pour répondre.
 */
export function creerRegie({
  questions, dureeMs = 15000, persona = 'classique', themes = [], dureeRevelation,
  jokers = JOKERS.map((j) => j.id),
}) {
  const total = questions.length;

  // Les jokers retenus pour cette partie, dans l'ordre canonique. Une liste
  // vide est un mode à part entière — pas de filet, c'est le plus rapide qui
  // gagne — et non une erreur de réglage.
  const autorises = JOKERS.map((j) => j.id).filter((id) => jokers.includes(id));

  /**
   * Combien de temps laisser sur la révélation.
   *
   * Le plancher suffit quand l'animateur ne fait que commenter, mais dès qu'il
   * lit la bonne réponse et son explication, une durée fixe couperait la fin de
   * la phrase — et la fin de la phrase, c'est justement le « ah bon, tiens » qui
   * fait la valeur de la manche. `dureeRevelation` est fourni par l'appli, qui
   * seule connaît la longueur des clips.
   */
  const tempsDeRevelation = (question, finale) => {
    const plancher = finale ? DUREE_REVELATION_FINALE_MS : DUREE_REVELATION_MS;
    // Plafonné : une explication à rallonge ne doit pas casser le rythme.
    const audio = Math.min(dureeRevelation?.(question) ?? 0, PLAFOND_REVELATION_MS);
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
    deadline: 0,
    finPhase: 0,
    question: null,
    annonce: '',
    annonceCle: '',
    resultat: null,
    podium: null,
    scores: {},
    jokers: {},          // id → jokers déjà consommés
    absences: {},        // id → manches consécutives sans réponse
    reponses: {},        // manche en cours seulement
  };

  const jokersRestants = (id) => autorises
    .filter((j) => !(etat.jokers[id] ?? []).includes(j));

  const classement = (joueurs) => joueurs
    .map((j) => ({ id: j.id, name: j.name, score: etat.scores[j.id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr'));

  function prepareManche(numero, now) {
    etat.manche = numero;
    etat.question = questions[numero - 1];
    etat.reponses = {};
    etat.resultat = null;
    etat.phase = 'manche';
    etat.startAt = now + DUREE_JOKERS_MS;
    etat.deadline = etat.startAt + dureeMs;
    etat.finPhase = etat.deadline;
    etat.annonceCle = numero === total ? 'derniereManche' : 'avantManche';
    etat.annonce = repliqueDe(persona, etat.annonceCle, { manche: numero, total });
  }

  function cloreManche(joueurs, now) {
    const finale = etat.manche === total;
    const { detail, scores, evenements } = resoudreManche({
      question: etat.question,
      reponses: etat.reponses,
      scores: etat.scores,
      joueurs,
      dureeMs,
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

    // Le plus rapide parmi ceux qui ont trouvé : c'est la ligne qui donne envie
    // de répondre vite plutôt que de répondre sûr.
    const bonnes = Object.entries(detail)
      .filter(([, r]) => r.correct)
      .sort((a, b) => a[1].elapsedMs - b[1].elapsedMs);
    const rapide = bonnes[0];
    const tete = classement(joueurs)[0];

    const mot = commentaire({ detail, joueurs, question: etat.question, persona });

    etat.phase = 'revelation';
    etat.resultat = {
      detail,
      evenements,
      commentaire: mot.texte,
      commentaireCle: mot.cle,
      rapide: rapide
        ? {
            nom: joueurs.find((j) => j.id === rapide[0])?.name ?? '—',
            secondes: (rapide[1].elapsedMs / 1000).toFixed(1).replace('.', ','),
          }
        : null,
      leader: tete && tete.score > 0 ? { nom: tete.name, points: tete.score } : null,
    };
    etat.finPhase = now + tempsDeRevelation(etat.question, finale);
  }

  return {
    get phase() {
      return etat.phase;
    },

    /** Le lobby se ferme, l'animateur ouvre la soirée. */
    lancer(now, joueurs) {
      if (etat.phase !== 'lobby') return false;
      etat.phase = 'intro';
      etat.finPhase = now + DUREE_INTRO_MS;
      etat.annonceCle = 'ouverture';
      etat.annonce = repliqueDe(persona, 'ouverture', { nb: joueurs.length });
      return true;
    },

    /**
     * Range les réponses arrivées du relais. Une réponse qui ne concerne pas la
     * manche en cours est jetée : c'est le cas normal d'un pupitre qui a répondu
     * juste après la fin du chrono.
     */
    encaisser(reponses) {
      let nouvelle = false;
      for (const reponse of reponses ?? []) {
        if (etat.phase !== 'manche' || reponse.round !== etat.manche) continue;
        if (etat.reponses[reponse.playerId]) continue;          // premier tap seulement
        if (reponse.choice == null) continue;
        etat.reponses[reponse.playerId] = {
          choice: reponse.choice,
          elapsedMs: reponse.elapsedMs,
          // Un joker écarté des réglages est ignoré, même si un pupitre bricolé
          // en renvoie un : le réglage de la partie fait loi ici, pas là-bas.
          joker: autorises.includes(reponse.joker) ? reponse.joker : null,
        };
        nouvelle = true;
      }
      return nouvelle;
    },

    /** Fait avancer l'horloge. Renvoie `true` si l'état publié doit changer. */
    avancer(now, joueurs) {
      if (etat.phase === 'lobby' || etat.phase === 'podium') return false;

      if (etat.phase === 'intro' && now >= etat.finPhase) {
        prepareManche(1, now);
        return true;
      }

      if (etat.phase === 'manche') {
        // On n'attend pas la fin du chrono si tout le monde a déjà répondu — et
        // on n'attend pas non plus un pupitre parti se chercher à boire depuis
        // deux manches.
        const attendus = joueurs.filter((j) => (etat.absences[j.id] ?? 0) < ABSENCES_AVANT_SOMMEIL);
        const tousRepondu = attendus.length > 0
          && attendus.every((j) => etat.reponses[j.id])
          && now >= etat.startAt;
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
          etat.annonceCle = 'podium';
          etat.annonce = podium[0]
            ? repliqueDe(persona, 'podium', { nom: podium[0].name, points: podium[0].score })
            : '';
          etat.podium = podium;
        }
        return true;
      }

      return false;
    },

    /**
     * L'état tel qu'il part sur le relais. La bonne réponse et l'explication
     * n'y figurent qu'à partir de la révélation : tant que le chrono tourne,
     * elles ne sont sur aucun autre appareil que celui-ci.
     */
    etatPublic(joueurs) {
      const question = etat.question && {
        id: etat.question.id,
        theme: etat.question.theme,
        texte: etat.question.texte,
        reponses: etat.question.reponses,
        ...(etat.phase === 'revelation'
          ? { bonne: etat.question.bonne, note: etat.question.note }
          : {}),
      };

      return {
        phase: etat.phase,
        manche: etat.manche,
        total,
        themes: etat.themes,
        persona,
        dureeMs,
        startAt: etat.startAt,
        deadline: etat.deadline,
        finPhase: etat.finPhase,
        // La clé désigne le clip audio ; le texte, lui, porte les prénoms.
        annonceCle: etat.annonceCle,
        finale: etat.manche === total,
        question,
        annonce: etat.annonce,
        resultat: etat.resultat,
        podium: etat.podium ?? null,
        classement: classement(joueurs),
        jokersActifs: autorises,
        jokers: Object.fromEntries(joueurs.map((j) => [j.id, jokersRestants(j.id)])),
        // Sert au pupitre à afficher « 3 sur 5 ont répondu » sans révéler quoi.
        ontRepondu: Object.keys(etat.reponses),
      };
    },
  };
}
