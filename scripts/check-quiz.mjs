// Vérifie les règles de Quiz entre amis et le relais de salons.
//
//   npm run check:quiz
//
// Aucune clé, aucun réseau : la résolution d'une manche et le relais sont deux
// morceaux purs, et ce sont eux qu'on relit quand quelqu'un conteste un score
// en fin de soirée.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resoudreManche, pointsDeRapidite, creerRegie, JOKERS, DUREE_JOKERS_MS,
  PLAFOND_REVELATION_MS, budgetDIntro,
} from '../web/quiz/js/engine.js';
import {
  dureeDeLaReplique, annonceDeManche, inventaireDesParoles, PERSONAS,
} from '../web/quiz/js/emcee.js';
import {
  QUESTIONS, THEMES, FILS_ROUGES, tirerQuestions, tailleDuPool, filRougeTrouve,
  ajouterQuestions, oublierLesPacks, toutesLesQuestions,
} from '../web/quiz/js/questions.js';
import { handlePackRequest, accorder } from '../lib/packs.js';
import { verifierTransaction, definirRacine, racineApple } from '../lib/apple.js';
import { typeDeManche } from '../web/quiz/js/manches/index.js';
import mix, { reconnu } from '../web/quiz/js/manches/mix.js';
import ttmc, { NIVEAU_MAX, NIVEAU_DEFAUT } from '../web/quiz/js/manches/ttmc.js';
import { handleRoomRequest } from '../lib/rooms.js';
import { enTetesCors, estPreflight } from '../lib/cors.js';
import { entierEnLettres, ordinalEnLettres, direLesNombres } from './nombres.mjs';
import * as nodeFs from 'node:fs';
import { inventaire } from './generate-audio.mjs';

const QUESTION = {
  id: 'test', theme: 'culture', type: 'qcm',
  texte: 'Question de test ?',
  reponses: ['Bonne', 'Fausse', 'Fausse aussi', 'Encore fausse'],
  bonne: 0,
  note: 'Parce que.',
};

const JOUEURS = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bo' },
  { id: 'c', name: 'Cé' },
];

const DUREE = 15000;

const manche = (reponses, scores = {}, options = {}) => resoudreManche({
  manche: QUESTION,
  reponses,
  scores,
  joueurs: JOUEURS,
  dureeMs: DUREE,
  finale: false,
  persona: 'classique',
  ...options,
});

/* --- Barème -------------------------------------------------------------- */

test('le barème va de 100 % à 20 % sur la durée de la manche', () => {
  assert.equal(pointsDeRapidite(0, DUREE, 1000), 1000);
  assert.equal(pointsDeRapidite(DUREE, DUREE, 1000), 200);
  assert.equal(pointsDeRapidite(DUREE / 2, DUREE, 1000), 600);
});

test('une réponse arrivée après le chrono ne descend pas sous le plancher', () => {
  assert.equal(pointsDeRapidite(DUREE * 5, DUREE, 1000), 200);
});

/* --- Résolution d'une manche --------------------------------------------- */

test('une bonne réponse rapide rapporte plus qu’une bonne réponse lente', () => {
  const { detail } = manche({
    a: { valeur: 0, elapsedMs: 1000, joker: null },
    b: { valeur: 0, elapsedMs: 12000, joker: null },
  });
  assert.ok(detail.a.points > detail.b.points);
  assert.ok(detail.a.correct && detail.b.correct);
});

test('une mauvaise réponse ne rapporte rien, et n’enlève rien', () => {
  const { detail, scores } = manche(
    { a: { valeur: 2, elapsedMs: 1000, joker: null } },
    { a: 500 },
  );
  assert.equal(detail.a.correct, false);
  assert.equal(detail.a.points, 0);
  assert.equal(scores.a, 500);
});

test('un joueur qui n’a pas répondu est marqué absent', () => {
  const { detail } = manche({ a: { valeur: 0, elapsedMs: 500, joker: null } });
  assert.equal(detail.b.absent, true);
  assert.equal(detail.b.points, 0);
});

/* --- Jokers -------------------------------------------------------------- */

test('le sang-froid annule le barème dégressif', () => {
  const { detail } = manche({
    a: { valeur: 0, elapsedMs: 14000, joker: 'sangfroid' },
    b: { valeur: 0, elapsedMs: 14000, joker: null },
  });
  assert.equal(detail.a.points, 1000);
  assert.ok(detail.a.points > detail.b.points);
});

test('le 50/50 divise les points de la manche par deux', () => {
  const { detail } = manche({
    a: { valeur: 0, elapsedMs: 0, joker: 'cinquante' },
    b: { valeur: 0, elapsedMs: 0, joker: null },
  });
  assert.equal(detail.b.points, 1000);
  assert.equal(detail.a.points, 500);
});

test('le 50/50 ne rapporte rien si on se trompe quand même', () => {
  const { detail } = manche({ a: { valeur: 1, elapsedMs: 0, joker: 'cinquante' } });
  assert.equal(detail.a.points, 0);
});

test('quitte ou double : doublé si juste, moitié perdue si faux', () => {
  const juste = manche({ a: { valeur: 0, elapsedMs: 0, joker: 'double' } });
  assert.equal(juste.detail.a.points, 2000);

  const rate = manche(
    { a: { valeur: 1, elapsedMs: 0, joker: 'double' } },
    { a: 900 },
  );
  assert.equal(rate.detail.a.points, -500);
  assert.equal(rate.scores.a, 400);
});

test('un total ne descend jamais sous zéro', () => {
  const { scores } = manche(
    { a: { valeur: 1, elapsedMs: 0, joker: 'double' } },
    { a: 100 },
  );
  assert.equal(scores.a, 0);
});

test('le vol prend la moitié des points que le leader gagne sur la manche', () => {
  // Bo mène. Ana vole : Bo gagnerait 1000, il n'en garde que 500.
  const { detail, scores } = manche(
    {
      a: { valeur: 0, elapsedMs: 3000, joker: 'vol' },
      b: { valeur: 0, elapsedMs: 0, joker: null },
    },
    { a: 0, b: 2000 },
  );
  assert.equal(detail.b.points, 500);
  assert.equal(detail.a.vol, 500);
  assert.equal(scores.b, 2500);
  assert.equal(detail.a.points, pointsDeRapidite(3000, DUREE, 1000) + 500);
});

test('le vol ne marche pas si le voleur s’est trompé', () => {
  const { detail } = manche(
    {
      a: { valeur: 3, elapsedMs: 1000, joker: 'vol' },
      b: { valeur: 0, elapsedMs: 0, joker: null },
    },
    { b: 2000 },
  );
  assert.equal(detail.b.points, 1000);
  assert.equal(detail.a.vol, undefined);
});

test('le sabotage efface ce que le leader gagne', () => {
  const { detail, scores } = manche(
    {
      a: { valeur: 0, elapsedMs: 2000, joker: 'sabotage' },
      b: { valeur: 0, elapsedMs: 0, joker: null },
    },
    { b: 2000 },
  );
  assert.equal(detail.b.points, 0);
  assert.equal(scores.b, 2000);
  assert.equal(detail.a.sabotage, 'b');
});

test('vol puis sabotage se cumulent sur la même manche', () => {
  // Ana vole la moitié, Cé efface le reste : le leader ne garde rien.
  const { detail } = manche(
    {
      a: { valeur: 0, elapsedMs: 2000, joker: 'vol' },
      b: { valeur: 0, elapsedMs: 0, joker: null },
      c: { valeur: 0, elapsedMs: 2000, joker: 'sabotage' },
    },
    { b: 3000 },
  );
  assert.equal(detail.a.vol, 500);
  assert.equal(detail.b.points, 0);
});

test('sans leader, vol et sabotage n’ont aucune cible — et le joker est rendu', () => {
  const { detail } = manche({
    a: { valeur: 0, elapsedMs: 1000, joker: 'vol' },
    b: { valeur: 0, elapsedMs: 0, joker: null },
  });
  assert.equal(detail.a.vol, undefined);
  assert.equal(detail.a.jokerRendu, true);
  assert.equal(detail.b.points, 1000);
});

test('un seul vol par manche : le plus rapide sert, l’autre récupère son joker', () => {
  const { detail } = manche(
    {
      a: { valeur: 0, elapsedMs: 5000, joker: 'vol' },
      b: { valeur: 0, elapsedMs: 0, joker: null },
      c: { valeur: 0, elapsedMs: 2000, joker: 'vol' },
    },
    { b: 4000 },
  );
  // Cé a répondu plus vite : c'est lui qui vole.
  assert.equal(detail.c.vol, 500);
  assert.equal(detail.a.vol, undefined);
  assert.equal(detail.a.jokerRendu, true);
  assert.equal(detail.c.jokerRendu, undefined);
  // Le leader n'est ponctionné qu'une seule fois.
  assert.equal(detail.b.points, 500);
});

test('un seul sabotage par manche', () => {
  const { detail } = manche(
    {
      a: { valeur: 0, elapsedMs: 4000, joker: 'sabotage' },
      b: { valeur: 0, elapsedMs: 0, joker: null },
      c: { valeur: 0, elapsedMs: 1000, joker: 'sabotage' },
    },
    { b: 4000 },
  );
  assert.equal(detail.c.sabotage, 'b');
  assert.equal(detail.a.sabotage, undefined);
  assert.equal(detail.a.jokerRendu, true);
  assert.equal(detail.b.points, 0);
});

test('un vol raté sur une mauvaise réponse est bien perdu', () => {
  const { detail } = manche(
    {
      a: { valeur: 2, elapsedMs: 1000, joker: 'vol' },
      b: { valeur: 0, elapsedMs: 0, joker: null },
    },
    { b: 2000 },
  );
  assert.equal(detail.a.jokerRendu, undefined);
});

test('on ne peut pas se voler ni se saboter soi-même', () => {
  const { detail } = manche(
    { a: { valeur: 0, elapsedMs: 0, joker: 'vol' } },
    { a: 5000 },
  );
  assert.equal(detail.a.vol, undefined);
  assert.equal(detail.a.points, 1000);
});

test('la manche finale vaut le double', () => {
  const { detail } = manche(
    { a: { valeur: 0, elapsedMs: 0, joker: null } },
    {},
    { finale: true },
  );
  assert.equal(detail.a.points, 2000);
});

/* --- Déroulé d'une partie ------------------------------------------------ */

/**
 * Fait tourner une régie sur une horloge simulée. `repondre` reçoit l'état
 * public à chaque pas et peut renvoyer des réponses de pupitres, exactement
 * comme le relais les livrerait.
 */
function jouerUnePartie({ questions, repondre, joueurs = JOUEURS, dureeMs = DUREE, jokers }) {
  const regie = creerRegie({ questions, dureeMs, persona: 'classique', jokers });
  let horloge = 1_000_000;
  regie.lancer(horloge, joueurs);

  const vues = [];
  for (let pas = 0; pas < 4000 && regie.phase !== 'podium'; pas += 1) {
    horloge += 100;
    const public_ = regie.etatPublic(joueurs);
    const reponses = repondre?.(public_, horloge) ?? [];
    if (reponses.length) regie.encaisser(reponses);
    if (regie.avancer(horloge, joueurs)) vues.push(regie.etatPublic(joueurs));
  }
  return { regie, vues, etatFinal: regie.etatPublic(joueurs) };
}

const troisQuestions = () => [1, 2, 3].map((n) => ({ ...QUESTION, id: `q${n}` }));

test('une partie va du lancement au podium', () => {
  const { etatFinal, vues } = jouerUnePartie({ questions: troisQuestions() });
  assert.equal(etatFinal.phase, 'podium');
  assert.equal(etatFinal.podium.length, JOUEURS.length);
  // Trois manches : chacune doit avoir été annoncée puis révélée.
  assert.equal(vues.filter((v) => v.phase === 'manche').length, 3);
  assert.equal(vues.filter((v) => v.phase === 'revelation').length, 3);
});

test('la régie publie l’annonce et le mot pour mot de ce qu’elle dit', () => {
  // C'est la régie qui tire, et elle publie les deux. Tiré sur chaque appareil,
  // le sort donnait une formule par téléphone — et une autre encore à l'écran.
  const textes = new Map(inventaireDesParoles().map((c) => [c.id, c.texte]));
  const { vues } = jouerUnePartie({ questions: troisQuestions() });

  const annonces = vues.filter((v) => v.phase === 'manche');
  assert.equal(annonces.length, 3);
  for (const vue of annonces) {
    assert.ok(vue.annonceClips.length >= 1, `manche ${vue.manche} : aucun clip publié`);
    assert.equal(vue.annonceDite, vue.annonceClips.map((id) => textes.get(id)).join(' '),
      `manche ${vue.manche} : l’écrit ne dit pas ce que la voix dit`);
    if (vue.annonceCle === 'avantManche') {
      assert.equal(vue.annonceClips[0], `emcee/classique/manche/${vue.manche}`);
    }
  }

  // Au podium, l'écrit COMPLÈTE le clip au lieu de le répéter : l'enregistrement
  // renvoie à l'écran, l'écran nomme le gagnant. `annonceDite` reste donc vide,
  // et c'est ce qui fait afficher la phrase qui porte le prénom.
  const fin = vues.at(-1);
  assert.equal(fin.phase, 'podium');
  assert.equal(fin.annonceDite, '');
  assert.match(fin.annonce, /Ana|Bo|Cé/);
});

test('la bonne réponse n’est publiée qu’à la révélation', () => {
  const { vues } = jouerUnePartie({ questions: troisQuestions() });
  for (const vue of vues.filter((v) => v.phase === 'manche')) {
    assert.equal(vue.question.bonne, undefined, 'la réponse a fuité pendant le chrono');
    assert.equal(vue.question.note, undefined);
  }
  for (const vue of vues.filter((v) => v.phase === 'revelation')) {
    assert.equal(typeof vue.question.bonne, 'number');
  }
});

test('répondre juste et vite gagne la partie', () => {
  const { etatFinal } = jouerUnePartie({
    questions: troisQuestions(),
    repondre: (vue, horloge) => {
      if (vue.phase !== 'manche' || horloge < vue.startAt) return [];
      // Ana répond juste dès le top, Bo juste mais tard, Cé se trompe.
      const depuis = horloge - vue.startAt;
      if (depuis === 100) {
        return [
          { playerId: 'a', round: vue.manche, reponse: 0, elapsedMs: 100 },
          { playerId: 'c', round: vue.manche, reponse: 1, elapsedMs: 100 },
        ];
      }
      if (depuis === 9000) {
        return [{ playerId: 'b', round: vue.manche, reponse: 0, elapsedMs: 9000 }];
      }
      return [];
    },
  });

  const [premier, deuxieme, troisieme] = etatFinal.podium;
  assert.equal(premier.id, 'a');
  assert.equal(deuxieme.id, 'b');
  assert.equal(troisieme.score, 0);
  assert.ok(premier.score > deuxieme.score);
});

test('une manche se clôt d’elle-même dès que tout le monde a répondu', () => {
  let mancheVueA = 0;
  const { etatFinal } = jouerUnePartie({
    questions: troisQuestions(),
    joueurs: [JOUEURS[0]],
    repondre: (vue, horloge) => {
      if (vue.phase !== 'manche' || horloge < vue.startAt) return [];
      if (vue.manche === 1) mancheVueA = Math.max(mancheVueA, horloge - vue.startAt);
      return horloge - vue.startAt === 100
        ? [{ playerId: 'a', round: vue.manche, reponse: 0, elapsedMs: 100 }]
        : [];
    },
  });
  assert.equal(etatFinal.phase, 'podium');
  // La manche n'a pas attendu les quinze secondes du chrono.
  assert.ok(mancheVueA < DUREE / 2, `la manche a duré ${mancheVueA} ms`);
});

test('un joker rendu reste disponible pour les manches suivantes', () => {
  // Personne n'a encore marqué en manche 1 : le vol n'a pas de cible.
  const { vues } = jouerUnePartie({
    questions: troisQuestions(),
    repondre: (vue, horloge) => (vue.phase === 'manche' && horloge - vue.startAt === 100
      ? [{
          playerId: 'a', round: vue.manche, reponse: 0, elapsedMs: 100,
          joker: vue.manche === 1 ? 'vol' : null,
        }]
      : []),
  });
  const apresManche1 = vues.find((v) => v.phase === 'revelation');
  assert.equal(apresManche1.resultat.detail.a.jokerRendu, true);
  assert.ok(apresManche1.jokers.a.includes('vol'), 'le vol aurait dû être rendu');
});

test('un joker n’est consommé qu’une fois, et seulement s’il a été joué', () => {
  const { vues } = jouerUnePartie({
    questions: troisQuestions(),
    repondre: (vue, horloge) => {
      if (vue.phase !== 'manche' || horloge - vue.startAt !== 100) return [];
      return [{
        playerId: 'a', round: vue.manche, reponse: 0, elapsedMs: 100,
        joker: vue.manche === 1 ? 'sangfroid' : null,
      }];
    },
  });
  const derniere = vues.at(-1);
  assert.ok(!derniere.jokers.a.includes('sangfroid'), 'le sang-froid devrait être consommé');
  assert.equal(derniere.jokers.a.length, JOKERS.length - 1);
  assert.equal(derniere.jokers.b.length, JOKERS.length);
});

test('une réponse qui arrive après la fin de la manche est ignorée', () => {
  const { etatFinal } = jouerUnePartie({
    questions: [{ ...QUESTION, id: 'q1' }],
    repondre: (vue, horloge) => (vue.phase === 'revelation' && horloge % 500 === 0
      ? [{ playerId: 'a', round: 1, reponse: 0, elapsedMs: 0 }]
      : []),
  });
  assert.equal(etatFinal.podium.every((j) => j.score === 0), true);
});

test('la fenêtre de jokers précède la question', () => {
  const regie = creerRegie({ questions: troisQuestions(), dureeMs: DUREE });
  regie.lancer(0, JOUEURS);
  let horloge = 0;
  while (regie.phase !== 'manche') {
    horloge += 100;
    regie.avancer(horloge, JOUEURS);
  }
  const vue = regie.etatPublic(JOUEURS);
  assert.equal(vue.startAt - horloge, DUREE_JOKERS_MS);
  assert.equal(vue.deadline - vue.startAt, DUREE);
});

test('le TTMC laisse plus de temps avant la question que les autres types', () => {
  // La même fenêtre sert partout à sortir un joker — une décision binaire, deux
  // gros boutons. Sur un TTMC il faut en plus lire la consigne, arbitrer, et
  // viser un cran sur dix : à six secondes, la plupart des gens repartaient au
  // niveau 1 par défaut, c'est-à-dire au pari le plus prudent, sur le seul type
  // de manche qui existe pour qu'on ose.
  const fenetre = (question) => {
    const regie = creerRegie({ questions: [question], dureeMs: DUREE });
    regie.lancer(0, JOUEURS);
    let horloge = 0;
    while (regie.phase !== 'manche') {
      horloge += 100;
      regie.avancer(horloge, JOUEURS);
    }
    return regie.etatPublic(JOUEURS).startAt - horloge;
  };

  const surTtmc = fenetre(carteTtmc());
  assert.equal(fenetre(QUESTION), DUREE_JOKERS_MS);
  assert.ok(surTtmc >= DUREE_JOKERS_MS + 5000,
    `fenêtre TTMC de ${surTtmc} ms, trop courte pour choisir un niveau`);
});

test('passer coupe la révélation, et rien d’autre', () => {
  const regie = creerRegie({ questions: troisQuestions(), dureeMs: DUREE });
  regie.lancer(0, JOUEURS);

  // Pendant l'intro et la manche, il n'y a rien à passer : le bouton n'est pas
  // affiché, mais la régie doit refuser quand même — c'est elle qui décide.
  let horloge = 0;
  assert.equal(regie.passer(horloge), false, 'passer a mordu sur l’intro');
  while (regie.phase !== 'manche') { horloge += 100; regie.avancer(horloge, JOUEURS); }
  assert.equal(regie.passer(horloge), false, 'passer a mordu sur la manche');

  while (regie.phase !== 'revelation') { horloge += 100; regie.avancer(horloge, JOUEURS); }
  const restait = regie.etatPublic(JOUEURS).finPhase - horloge;
  assert.ok(restait > 1000, 'la révélation était déjà finie, le test ne prouve rien');

  assert.equal(regie.passer(horloge), true);
  // La manche suivante s'enchaîne au battement d'après, pas dans dix secondes.
  horloge += 100;
  assert.equal(regie.avancer(horloge, JOUEURS), true);
  assert.equal(regie.phase, 'manche');
  assert.equal(regie.etatPublic(JOUEURS).manche, 2);

  // Et on ne rallonge jamais : repasser sur une phase déjà close ne la rouvre
  // pas, sans quoi un double tap ramènerait un écran que la table a quitté.
  while (regie.phase !== 'revelation') { horloge += 100; regie.avancer(horloge, JOUEURS); }
  regie.passer(horloge);
  const fin = regie.etatPublic(JOUEURS).finPhase;
  regie.passer(horloge + 5000);
  assert.equal(regie.etatPublic(JOUEURS).finPhase, fin);
});

/* --- Les autres types de manche ------------------------------------------ */

const noterAvec = (typeId, entree, reponses) => {
  const type = typeDeManche(typeId);
  const prepare = type.preparer(entree, (l) => l);   // sans mélange : lisible
  return { prepare, notes: type.noter(prepare, reponses) };
};

test('estimation : le plus proche rafle la manche, les autres marquent à proportion', () => {
  const { notes } = noterAvec('estimation', { id: 'e', valeur: 100 }, {
    a: { valeur: 98, elapsedMs: 9000 },
    b: { valeur: 130, elapsedMs: 100 },
    c: { valeur: 400, elapsedMs: 100 },
  });
  assert.equal(notes.a.correct, true, 'le plus proche gagne, même lent');
  assert.equal(notes.a.fraction, 1);
  assert.equal(notes.b.correct, false);
  assert.ok(notes.b.fraction > 0 && notes.b.fraction < 1, 'être proche rapporte un peu');
  assert.equal(notes.c.fraction, 0, 'très loin ne rapporte rien');
});

test('estimation : à égalité parfaite, la rapidité départage', () => {
  const { notes } = noterAvec('estimation', { id: 'e', valeur: 50 }, {
    a: { valeur: 60, elapsedMs: 5000 },
    b: { valeur: 40, elapsedMs: 900 },
  });
  assert.equal(notes.b.correct, true);
  assert.equal(notes.a.correct, false);
});

test('estimation : la rapidité ne pèse rien dans les points', () => {
  const lent = manche(
    { a: { valeur: 100, elapsedMs: 14000, joker: null } },
    {},
    { manche: typeDeManche('estimation').preparer({ id: 'e', valeur: 100 }) },
  );
  assert.equal(lent.detail.a.points, 1000, 'répondre au dernier moment ne coûte rien');
});

test('classement : les points suivent le nombre de positions justes', () => {
  const entree = { id: 'o', elements: ['A', 'B', 'C', 'D'] };
  const { notes } = noterAvec('ordre', entree, {
    a: { valeur: [0, 1, 2, 3], elapsedMs: 0 },     // parfait
    b: { valeur: [0, 1, 3, 2], elapsedMs: 0 },     // deux justes
    c: { valeur: [3, 2, 1, 0], elapsedMs: 0 },     // tout à l'envers
  });
  assert.equal(notes.a.correct, true);
  assert.equal(notes.a.fraction, 1);
  assert.equal(notes.b.justes, 2);
  assert.equal(notes.b.fraction, 0.5);
  assert.equal(notes.c.justes, 0);
});

test('classement : une réponse qui n’est pas une permutation est refusée', () => {
  const type = typeDeManche('ordre');
  assert.equal(type.lire([0, 0, 0, 0]), null, 'répondre quatre fois le même');
  assert.equal(type.lire([0, 1, 2]), null, 'liste trop courte');
  assert.equal(type.lire([0, 1, 2, 9]), null, 'index hors bornes');
  assert.deepEqual(type.lire([3, 0, 2, 1]), [3, 0, 2, 1]);
});

test('rafale : chaque affirmation juste compte pour un cinquième', () => {
  const entree = {
    id: 'r',
    affirmations: [
      { texte: '1', vrai: true }, { texte: '2', vrai: false }, { texte: '3', vrai: true },
      { texte: '4', vrai: false }, { texte: '5', vrai: true },
    ],
  };
  const { notes } = noterAvec('rafale', entree, {
    a: { valeur: [true, false, true, false, true], elapsedMs: 0 },
    b: { valeur: [true, false, true, true, null], elapsedMs: 0 },
  });
  assert.equal(notes.a.correct, true);
  assert.equal(notes.b.justes, 3);
  assert.equal(notes.b.fraction, 0.6);
});

test('rafale : une affirmation laissée vide compte comme fausse, pas comme une erreur', () => {
  const type = typeDeManche('rafale');
  assert.deepEqual(type.lire([true, null, false, null, true]), [true, null, false, null, true]);
  assert.equal(type.lire([true, true]), null, 'il en faut cinq');
});

test('chaque type sait dire sa solution en clair', () => {
  const cas = [
    ['qcm', QUESTION, 'Bonne'],
    ['estimation', { id: 'e', valeur: 206, unite: 'os' }, '206 os'],
    ['ordre', { id: 'o', elements: ['A', 'B', 'C', 'D'] }, 'A, puis B, puis C, puis D'],
  ];
  for (const [typeId, entree, attendu] of cas) {
    const type = typeDeManche(typeId);
    assert.equal(type.solutionTexte(type.preparer(entree, (l) => l)), attendu);
  }
});

test('le chrono s’allonge sur les types qui demandent plus de gestes', () => {
  assert.equal(typeDeManche('qcm').facteurDuree, 1);
  for (const id of ['estimation', 'ordre', 'rafale']) {
    assert.ok(typeDeManche(id).facteurDuree > 1, `${id} devrait laisser plus de temps`);
  }
});


/* --- Tu te mets combien ? -------------------------------------------------- */

const CARTE_TTMC = {
  id: 'ttm-test', theme: 'culture', type: 'ttmc',
  texte: 'Test — tu te mets combien ?',
  note: 'Chacun sa question.',
  niveaux: Array.from({ length: NIVEAU_MAX }, (_, i) => ({
    texte: `Question de niveau ${i + 1} ?`,
    reponses: [`Bonne ${i + 1}`, 'Fausse', 'Fausse aussi', 'Encore fausse'],
    bonne: 0,
    note: `Explication du niveau ${i + 1}.`,
  })),
};
const carteTtmc = () => ttmc.preparer(CARTE_TTMC, (l) => l);

test('le barème du TTMC suit le niveau annoncé, pas la difficulté réelle', () => {
  const carte = carteTtmc();
  const notes = ttmc.noter(carte, {
    prudent: { valeur: carte.niveaux[0].bonne, niveau: 1, elapsedMs: 0 },
    culotte: { valeur: carte.niveaux[9].bonne, niveau: 10, elapsedMs: 0 },
  });
  assert.equal(notes.prudent.fraction, 0.1);
  assert.equal(notes.culotte.fraction, 1);
  assert.ok(notes.culotte.fraction > notes.prudent.fraction);
});

test('deux joueurs d’une même manche répondent à deux questions différentes', () => {
  // C'est toute la particularité du type : la bonne réponse de l'un n'est pas
  // celle de l'autre, alors qu'ils jouent la même manche.
  const carte = carteTtmc();
  const notes = ttmc.noter(carte, {
    a: { valeur: carte.niveaux[2].bonne, niveau: 3, elapsedMs: 0 },
    b: { valeur: carte.niveaux[2].bonne, niveau: 7, elapsedMs: 0 },
  });
  assert.equal(notes.a.correct, true, 'la réponse du niveau 3 vaut pour qui s’y est mis');
  // Le mélange étant neutralisé ici, une réponse juste au niveau 3 ne l'est au
  // niveau 7 que par coïncidence d'index — on vérifie donc l'énoncé servi.
  assert.notEqual(carte.niveaux[2].texte, carte.niveaux[6].texte);
});

test('se tromper ne rapporte rien, quel que soit le niveau annoncé', () => {
  const carte = carteTtmc();
  const notes = ttmc.noter(carte, {
    a: { valeur: (carte.niveaux[9].bonne + 1) % 4, niveau: 10, elapsedMs: 0 },
  });
  assert.equal(notes.a.correct, false);
  assert.equal(notes.a.fraction, 0);
});

test('un niveau farfelu est ramené dans les clous', () => {
  const carte = carteTtmc();
  for (const [envoye, attendu] of [[0, 1], [99, NIVEAU_MAX], [-5, 1], [3.6, 4]]) {
    const notes = ttmc.noter(carte, { a: { valeur: 0, niveau: envoye, elapsedMs: 0 } });
    assert.equal(notes.a.niveau, attendu, `niveau ${envoye}`);
  }
});

test('qui n’annonce rien joue le niveau le plus facile', () => {
  const carte = carteTtmc();
  const notes = ttmc.noter(carte, { a: { valeur: carte.niveaux[0].bonne, elapsedMs: 0 } });
  assert.equal(notes.a.niveau, NIVEAU_DEFAUT);
  assert.equal(notes.a.correct, true);
});

test('les dix énoncés partent dès l’ouverture, les dix solutions non', () => {
  // Les énoncés doivent partir : un pupitre qui n'a pas le pack d'où vient la
  // carte ne pourrait pas afficher sa question autrement.
  const carte = carteTtmc();
  const ouverte = ttmc.publier(carte, false);
  assert.equal(ouverte.niveaux.length, NIVEAU_MAX);
  assert.ok(ouverte.niveaux.every((n) => n.texte && n.reponses.length === 4));
  assert.ok(ouverte.niveaux.every((n) => n.bonne === undefined), 'une solution a fuité');
  assert.ok(ouverte.niveaux.every((n) => n.note === undefined), 'une explication a fuité');

  const revelee = ttmc.publier(carte, true);
  assert.ok(revelee.niveaux.every((n) => n.bonne !== undefined && n.note));
});

test('le mélange garde chaque bonne réponse alignée sur son texte, niveau par niveau', () => {
  const carte = ttmc.preparer(CARTE_TTMC, (l) => l.slice().reverse());
  carte.niveaux.forEach((n, i) => {
    assert.equal(n.reponses[n.bonne], CARTE_TTMC.niveaux[i].reponses[CARTE_TTMC.niveaux[i].bonne]);
  });
});

test('le pari s’annonce, se corrige, puis se ferme dès qu’on a répondu', () => {
  const regie = creerRegie({ questions: [carteTtmc()], dureeMs: DUREE });
  regie.lancer(0, JOUEURS);
  regie.avancer(10_000, JOUEURS);          // au-delà de l'intro : la manche 1 existe
  assert.equal(regie.etatPublic(JOUEURS).phase, 'manche');

  regie.encaisser([{ playerId: 'a', round: 1, niveau: 7 }]);
  assert.equal(regie.etatPublic(JOUEURS).niveaux.a, 7);

  // On a le droit d'hésiter tant que la question n'est pas ouverte.
  regie.encaisser([{ playerId: 'a', round: 1, niveau: 4 }]);
  assert.equal(regie.etatPublic(JOUEURS).niveaux.a, 4);

  // Mais plus une fois qu'on a répondu : ce serait choisir son barème après coup.
  regie.encaisser([{ playerId: 'a', round: 1, reponse: 0, elapsedMs: 500 }]);
  regie.encaisser([{ playerId: 'a', round: 1, niveau: 10 }]);
  assert.equal(regie.etatPublic(JOUEURS).niveaux.a, 4);
});

test('les niveaux annoncés sont publics — c’est la moitié du plaisir', () => {
  const regie = creerRegie({ questions: [carteTtmc()], dureeMs: DUREE });
  regie.lancer(0, JOUEURS);
  regie.avancer(10_000, JOUEURS);
  regie.encaisser([
    { playerId: 'a', round: 1, niveau: 9 },
    { playerId: 'b', round: 1, niveau: 2 },
  ]);
  assert.deepEqual(regie.etatPublic(JOUEURS).niveaux, { a: 9, b: 2 });
});

test('un pari annoncé sur un type qui n’en a pas est ignoré', () => {
  const regie = creerRegie({ questions: troisQuestions(), dureeMs: DUREE });
  regie.lancer(0, JOUEURS);
  regie.avancer(10_000, JOUEURS);
  assert.equal(regie.etatPublic(JOUEURS).question.type, 'qcm');
  assert.equal(regie.encaisser([{ playerId: 'a', round: 1, niveau: 8 }]), false);
  assert.deepEqual(regie.etatPublic(JOUEURS).niveaux, {});
});

test('l’animateur nomme celui qui a osé, pas le premier de la liste', () => {
  // La réplique félicitait le premier joueur correct — en général celui qui
  // s'était mis à 2, pendant qu'un autre tenait un 10.
  const carte = carteTtmc();
  const { detail } = resoudreManche({
    manche: carte,
    reponses: {
      a: { valeur: carte.niveaux[1].bonne, niveau: 2, elapsedMs: 0 },
      c: { valeur: carte.niveaux[9].bonne, niveau: 10, elapsedMs: 0 },
    },
    scores: {},
    joueurs: JOUEURS,
    dureeMs: DUREE,
  });
  assert.ok(detail.a.correct && detail.c.correct);
  assert.equal(ttmc.heros(Object.entries(detail)), 'c');
});

test('gros pari tenu : l’animateur a sa réplique, distincte du cas ordinaire', () => {
  const jouer = (niveau) => jouerUnePartie({
    questions: [carteTtmc()],
    repondre: (vue, horloge) => {
      if (vue.phase !== 'manche') return [];
      if (horloge - vue.startAt === -1000) return [{ playerId: 'a', round: vue.manche, niveau }];
      if (horloge - vue.startAt === 100) {
        return [{ playerId: 'a', round: vue.manche, reponse: 0, elapsedMs: 500 }];
      }
      return [];
    },
  }).vues.find((v) => v.phase === 'revelation');

  assert.equal(jouer(9).resultat.commentaireCle, 'ttmcGrosPari');
  assert.equal(jouer(2).resultat.commentaireCle, 'ttmcTrouve');
});

/* --- Le mix --------------------------------------------------------------- */

const CARTE = {
  id: 'mix-test', theme: 'musique', type: 'mix',
  texte: 'Une chanson avec un animal dans le titre',
  acceptees: [
    { titre: 'Eye of the Tiger', artiste: 'Survivor' },
    { titre: 'Blackbird', artiste: 'The Beatles' },
    { titre: 'One', artiste: 'U2' },
  ],
  note: 'Note de test.',
};
const carteMix = () => mix.preparer(CARTE);

test('un titre est reconnu malgré la casse, les accents et la ponctuation', () => {
  const { acceptees } = carteMix();
  for (const essai of ['Eye of the Tiger', 'eye of the tiger', 'EYE OF THE TIGER !', '  blackbird  ']) {
    assert.ok(reconnu(acceptees, essai), `« ${essai} » aurait dû passer`);
  }
});

test('un fragment suffit, à condition de commencer sur un début de mot', () => {
  const { acceptees } = carteMix();
  // Personne ne tape un titre entier avec un verre dans l'autre main.
  assert.equal(reconnu(acceptees, 'tiger')?.titre, 'Eye of the Tiger');
  // Mais un fragment pris au milieu d'un mot, non : ce serait du hasard.
  assert.equal(reconnu(acceptees, 'ackbird'), null);
  // Et des mots vides ne désignent rien, même en nombre suffisant de lettres :
  // « of the » raflait le premier titre de la liste où ces deux mots se suivent.
  assert.equal(reconnu(acceptees, 'of th'), null);
  assert.equal(reconnu(acceptees, 'of the'), null);
  // Un titre entier reste reconnu quelle que soit sa longueur.
  assert.equal(reconnu(acceptees, 'one')?.titre, 'One');
});

test('une proposition vide ou hors sujet ne rapporte rien', () => {
  const { acceptees } = carteMix();
  for (const essai of ['', '   ', null, 'Bohemian Rhapsody']) {
    assert.equal(reconnu(acceptees, essai), null, `« ${essai} » n’aurait pas dû passer`);
  }
});

test('toute proposition reconnue marque, pas seulement la première', () => {
  const notes = mix.noter(carteMix(), {
    a: { valeur: 'Eye of the Tiger', elapsedMs: 3000 },
    b: { valeur: 'Blackbird', elapsedMs: 9000 },
  });
  assert.ok(notes.a.correct && notes.b.correct);
  assert.equal(notes.a.fraction, 1);
  assert.equal(notes.b.fraction, 1);
});

test('un titre déjà cité ne compte plus, et c’est le plus rapide qui l’emporte', () => {
  const notes = mix.noter(carteMix(), {
    lent: { valeur: 'eye of the tiger', elapsedMs: 8000 },
    rapide: { valeur: 'Eye of the Tiger', elapsedMs: 2000 },
  });
  assert.equal(notes.rapide.correct, true);
  assert.equal(notes.lent.correct, false);
  assert.equal(notes.lent.dejaCite, true);
  // Le perdant garde le titre reconnu : l'écran doit pouvoir dire pourquoi.
  assert.equal(notes.lent.titre, 'Eye of the Tiger');
});

test('sur le mix, le premier marque plus que le second à titre égal', () => {
  // C'est la course de DJ Set : deux bonnes réponses, deux scores différents.
  const carte = carteMix();
  const resultat = resoudreManche({
    manche: carte,
    reponses: {
      a: { valeur: 'Eye of the Tiger', elapsedMs: 1000 },
      b: { valeur: 'Blackbird', elapsedMs: 14000 },
    },
    scores: {},
    joueurs: JOUEURS,
    dureeMs: DUREE,
  });
  assert.ok(resultat.detail.a.points > resultat.detail.b.points);
  assert.ok(resultat.detail.b.points > 0);
});

test('l’annonce d’un mix ne présente jamais trois titres comme « la » réponse', () => {
  // Le gabarit commun dit « {nb} d’entre vous ont trouvé : {reponse} », et
  // {reponse} valait les trois premiers titres de la carte. À l'écran, ça
  // donnait trois chansons que personne n'avait citées, présentées comme la
  // solution. Le mix a donc ses propres répliques.
  const jouer = (valeur) => jouerUnePartie({
    questions: [mix.preparer(CARTE)],
    repondre: (vue, horloge) => (
      vue.phase === 'manche' && horloge - vue.startAt === 100
        ? [{ playerId: 'a', round: vue.manche, reponse: valeur, elapsedMs: 1000 }]
        : []
    ),
  });

  for (const [cas, valeur, cle] of [
    ['trouvé', 'Blackbird', 'mixTrouve'],
    ['bredouille', 'Bohemian Rhapsody', 'mixPersonne'],
  ]) {
    const vue = jouer(valeur).vues.find((v) => v.phase === 'revelation');
    assert.equal(vue.resultat.commentaireCle, cle, `${cas} : mauvaise réplique`);
    for (const titre of CARTE.acceptees.map((t) => t.titre)) {
      assert.ok(
        !vue.resultat.commentaire.includes(titre),
        `${cas} : « ${titre} » est annoncé comme la bonne réponse`,
      );
    }
  }
});

test('la liste des titres ne part qu’à la révélation', () => {
  const carte = carteMix();
  assert.equal(mix.publier(carte, false).acceptees, undefined);
  assert.equal(mix.publier(carte, true).acceptees.length, 3);
});

test('le mix laisse plus de temps qu’un QCM : il faut taper', () => {
  assert.ok(mix.facteurDuree > typeDeManche('qcm').facteurDuree);
});

/* --- Le fil rouge --------------------------------------------------------- */

const FIL = FILS_ROUGES.find((f) => f.id === 'rouge');

test('chaque fil rouge a de quoi se jouer : un mot, un indice, sa révélation', () => {
  const ids = FILS_ROUGES.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants de fils en double');

  for (const fil of FILS_ROUGES) {
    const siennes = QUESTIONS.filter((q) => q.fil === fil.id);
    assert.ok(siennes.length >= 4, `${fil.id} : ${siennes.length} questions, il en faut au moins quatre`);
    assert.ok(fil.solution && fil.indice && fil.revelation, `${fil.id} : texte manquant`);
    assert.ok(filRougeTrouve(fil, fil.solution), `${fil.id} : sa propre solution devrait passer`);

    // La bonne réponse doit vraiment porter le mot, sinon le fil est insoluble.
    for (const q of siennes) {
      const bonne = q.reponses[q.bonne];
      assert.ok(filRougeTrouve(fil, bonne), `${q.id} : « ${bonne} » ne contient pas le mot du fil`);
    }
    // Et une mauvaise réponse qui le porterait aussi vendrait la mèche.
    for (const q of siennes) {
      for (const [i, texte] of q.reponses.entries()) {
        if (i === q.bonne) continue;
        assert.ok(!filRougeTrouve(fil, texte), `${q.id} : le leurre « ${texte} » porte le mot du fil`);
      }
    }
  }
});

test('deux fils rouges ne se répondent jamais l’un pour l’autre', () => {
  for (const fil of FILS_ROUGES) {
    for (const autre of FILS_ROUGES) {
      if (autre.id === fil.id) continue;
      assert.ok(
        !filRougeTrouve(fil, autre.solution),
        `« ${autre.solution} » gagnerait la prime du fil « ${fil.id} »`,
      );
    }
  }
});

test('le fil rouge se reconnaît malgré la casse, les accents et les articles', () => {
  for (const essai of ['rouge', 'Le Rouge', 'LE ROUGE !', 'la couleur rouge', '  rouge  ', 'lerouge']) {
    assert.ok(filRougeTrouve(FIL, essai), `« ${essai} » aurait dû passer`);
  }
  for (const essai of ['bleu', '', 'vert pomme', null]) {
    assert.ok(!filRougeTrouve(FIL, essai), `« ${essai} » n’aurait pas dû passer`);
  }
});

test('le mot du fil doit être proposé entier, pas caché dans un autre', () => {
  // Avec une comparaison en sous-chaîne, « le château » raflait la prime du
  // fil « chat ». C'est la raison d'être de la comparaison mot à mot.
  const chat = FILS_ROUGES.find((f) => f.id === 'chat');
  for (const essai of ['chat', 'le chat', 'les chats', 'un chat noir']) {
    assert.ok(filRougeTrouve(chat, essai), `« ${essai} » aurait dû passer`);
  }
  for (const essai of ['le château', 'un achat', 'chatouille']) {
    assert.ok(!filRougeTrouve(chat, essai), `« ${essai} » n’aurait pas dû passer`);
  }
});

test('les questions du fil rouge sont réparties dans la partie, jamais groupées', () => {
  // Y compris sur une partie courte, où le fil pèse la moitié des manches.
  for (const fil of FILS_ROUGES) {
    const siennes = QUESTIONS.filter((q) => q.fil === fil.id).length;
    for (const nombre of [8, 12, 16, 20]) {
      const tirage = tirerQuestions({ themes: [], nombre, fil: fil.id });
      const positions = tirage
        .map((q, i) => (QUESTIONS.find((e) => e.id === q.id)?.fil ? i : -1))
        .filter((i) => i >= 0);

      assert.equal(positions.length, siennes, `${fil.id}, ${nombre} manches : toutes les questions du fil`);
      assert.ok(positions[0] >= 1, `${fil.id}, ${nombre} manches : jamais en toute première`);
      const ecarts = positions.slice(1).map((p, i) => p - positions[i]);
      assert.ok(ecarts.every((e) => e >= 2), `${fil.id}, ${nombre} manches, groupées : ${positions.join(', ')}`);
    }
  }
});

test('trouver le fil rouge rapporte une prime, et une seule fois', () => {
  const regie = creerRegie({ questions: troisQuestions(), dureeMs: DUREE, fil: FIL });
  regie.lancer(0, JOUEURS);
  regie.avancer(0, JOUEURS);

  regie.encaisser([{ playerId: 'a', fil: 'le rouge' }]);
  const vue = regie.etatPublic(JOUEURS);
  assert.equal(vue.fil.trouve.nom, 'Ana');
  assert.ok(vue.fil.trouve.prime > 0);
  assert.equal(vue.classement.find((j) => j.id === 'a').score, vue.fil.trouve.prime);

  // Bo arrive après la bataille : plus rien à gagner.
  regie.encaisser([{ playerId: 'b', fil: 'le rouge' }]);
  assert.equal(regie.etatPublic(JOUEURS).fil.trouve.nom, 'Ana');
  assert.equal(regie.etatPublic(JOUEURS).classement.find((j) => j.id === 'b').score, 0);
});

test('se tromper sur le fil rouge coûte deux manches de silence', () => {
  const regie = creerRegie({ questions: troisQuestions(), dureeMs: DUREE, fil: FIL });
  regie.lancer(0, JOUEURS);
  regie.avancer(0, JOUEURS);

  regie.encaisser([{ playerId: 'a', fil: 'bleu' }]);
  const vue = regie.etatPublic(JOUEURS);
  assert.equal(vue.fil.trouve, null);
  assert.equal(vue.fil.bloques.a, vue.manche + 2);

  // Même la bonne réponse ne passe pas tant que le blocage tient.
  regie.encaisser([{ playerId: 'a', fil: 'rouge' }]);
  assert.equal(regie.etatPublic(JOUEURS).fil.trouve, null);
});

test('la solution du fil rouge n’est publiée qu’une fois trouvée', () => {
  const regie = creerRegie({ questions: troisQuestions(), dureeMs: DUREE, fil: FIL });
  regie.lancer(0, JOUEURS);
  regie.avancer(0, JOUEURS);
  assert.equal(regie.etatPublic(JOUEURS).fil.solution, undefined);
  regie.encaisser([{ playerId: 'a', fil: 'rouge' }]);
  assert.equal(regie.etatPublic(JOUEURS).fil.solution, FIL.solution);
});

test('sans fil rouge demandé, l’état n’en parle pas', () => {
  const { vues } = jouerUnePartie({ questions: troisQuestions() });
  assert.equal(vues[0].fil, null);
});

/* --- Jokers choisis à la partie ------------------------------------------ */

const repondAvec = (joker) => (vue, horloge) => (
  vue.phase === 'manche' && horloge - vue.startAt === 100
    ? [{ playerId: 'a', round: vue.manche, reponse: 0, elapsedMs: 12000, joker }]
    : []
);

test('une partie peut n’ouvrir qu’une partie des jokers', () => {
  const { vues } = jouerUnePartie({
    questions: troisQuestions(),
    jokers: ['double', 'sangfroid'],
  });
  const vue = vues[0];
  assert.deepEqual(vue.jokersActifs, ['double', 'sangfroid']);
  assert.deepEqual(vue.jokers.a, ['double', 'sangfroid']);
});

test('l’ordre des jokers reste celui du jeu, pas celui du réglage', () => {
  const { vues } = jouerUnePartie({
    questions: troisQuestions(),
    jokers: ['cinquante', 'double'],
  });
  assert.deepEqual(vues[0].jokersActifs, ['double', 'cinquante']);
});

test('une partie sans aucun joker est un mode valide', () => {
  const { vues, etatFinal } = jouerUnePartie({ questions: troisQuestions(), jokers: [] });
  assert.deepEqual(vues[0].jokersActifs, []);
  assert.deepEqual(vues[0].jokers.a, []);
  assert.equal(etatFinal.phase, 'podium');
});

test('un joker écarté des réglages n’a aucun effet, même envoyé par un pupitre', () => {
  // Sang-froid ferait marquer le maximum ; sans lui, le barème s'applique.
  const avec = jouerUnePartie({
    questions: troisQuestions(),
    jokers: ['sangfroid'],
    repondre: repondAvec('sangfroid'),
  });
  const sans = jouerUnePartie({
    questions: troisQuestions(),
    jokers: [],
    repondre: repondAvec('sangfroid'),
  });

  const gainAvec = avec.vues.find((v) => v.phase === 'revelation').resultat.detail.a.points;
  const gainSans = sans.vues.find((v) => v.phase === 'revelation').resultat.detail.a.points;
  assert.equal(gainAvec, 1000);
  assert.equal(gainSans, pointsDeRapidite(12000, DUREE, 1000));
  assert.ok(gainSans < gainAvec);
});

test('un joker écarté n’est pas consommé non plus', () => {
  const { vues } = jouerUnePartie({
    questions: troisQuestions(),
    jokers: ['double'],
    repondre: repondAvec('sangfroid'),
  });
  // Le seul joker ouvert reste disponible : rien n'a été dépensé.
  assert.deepEqual(vues.at(-1).jokers.a, ['double']);
});

/* --- Banque de questions ------------------------------------------------- */

test('chaque entrée de banque est complète pour son type', () => {
  for (const q of QUESTIONS) {
    const type = q.type ?? 'qcm';
    assert.ok(q.texte?.length > 3, `${q.id} : énoncé manquant`);
    assert.ok(q.note?.length > 10, `${q.id} : explication manquante`);
    assert.ok(THEMES.some((t) => t.id === q.theme), `${q.id} : thème inconnu`);

    if (type === 'qcm') {
      assert.equal(q.reponses.length, 4, `${q.id} : quatre réponses attendues`);
      assert.ok(q.bonne >= 0 && q.bonne < 4, `${q.id} : index de bonne réponse`);
      assert.equal(new Set(q.reponses).size, 4, `${q.id} : réponses en double`);
    }
    if (type === 'estimation') {
      assert.ok(Number.isFinite(q.valeur), `${q.id} : valeur attendue`);
    }
    if (type === 'ordre') {
      assert.equal(q.elements.length, 4, `${q.id} : quatre éléments attendus`);
      assert.equal(new Set(q.elements).size, 4, `${q.id} : éléments en double`);
    }
    if (type === 'ttmc') {
      assert.equal(q.niveaux.length, NIVEAU_MAX, `${q.id} : il faut ${NIVEAU_MAX} niveaux`);
      q.niveaux.forEach((n, i) => {
        assert.equal(n.reponses.length, 4, `${q.id} niveau ${i + 1} : quatre réponses`);
        assert.equal(new Set(n.reponses).size, 4, `${q.id} niveau ${i + 1} : réponses en double`);
        assert.ok(n.bonne >= 0 && n.bonne < 4, `${q.id} niveau ${i + 1} : index de bonne réponse`);
        assert.ok(n.texte && n.note, `${q.id} niveau ${i + 1} : énoncé ou explication manquant`);
      });
      const enonces = q.niveaux.map((n) => n.texte);
      assert.equal(new Set(enonces).size, enonces.length, `${q.id} : deux niveaux posent la même question`);
    }
    if (type === 'mix') {
      assert.ok(q.acceptees.length >= 10, `${q.id} : ${q.acceptees.length} titres, il en faut au moins dix`);
      const titres = q.acceptees.map((t) => t.titre.toLowerCase());
      assert.equal(new Set(titres).size, titres.length, `${q.id} : titre en double`);
      assert.ok(q.acceptees.every((t) => t.titre && t.artiste), `${q.id} : titre ou artiste manquant`);
    }
    if (type === 'rafale') {
      assert.equal(q.affirmations.length, 5, `${q.id} : cinq affirmations attendues`);
      assert.ok(q.affirmations.some((a) => a.vrai), `${q.id} : que des fausses`);
      assert.ok(q.affirmations.some((a) => !a.vrai), `${q.id} : que des vraies`);
    }
  }
});

test('les identifiants de questions sont uniques', () => {
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('aucun énoncé n’est posé deux fois', () => {
  // Deux questions identiques dans la même soirée, et l'animateur a l'air d'un
  // disque rayé. Le tirage ne peut pas s'en rendre compte : ce sont deux
  // entrées distinctes, avec deux identifiants distincts.
  const vus = new Map();
  // Les dix niveaux d'une carte TTMC comptent comme dix énoncés : ils se jouent
  // dans les mêmes parties que le reste de la banque, et rien n'empêche d'y
  // recopier une question déjà posée ailleurs.
  const enonces = QUESTIONS.flatMap((q) => (
    q.type === 'ttmc'
      ? q.niveaux.map((n, i) => [`${q.id} niveau ${i + 1}`, n.texte])
      : [[q.id, q.texte]]
  ));

  for (const [ou, texte] of enonces) {
    const cle = texte.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
    assert.ok(!vus.has(cle), `${ou} répète l’énoncé de ${vus.get(cle)}`);
    vus.set(cle, ou);
  }
});

test('deux questions d’un même thème n’ont pas la même bonne réponse', () => {
  // Sinon la seconde se devine : « le golf » venait déjà de servir dix minutes
  // plus tôt, et il suffisait d'avoir suivi.
  for (const theme of THEMES) {
    const vus = new Map();
    for (const q of QUESTIONS) {
      if (q.theme !== theme.id || (q.type ?? 'qcm') !== 'qcm') continue;
      const bonne = q.reponses[q.bonne].toLowerCase();
      assert.ok(!vus.has(bonne), `${theme.nom} : ${q.id} et ${vus.get(bonne)} répondent « ${bonne} »`);
      vus.set(bonne, q.id);
    }
  }
});

test('deux niveaux d’une même carte ne répondent pas la même chose', () => {
  // Dix questions d'affilée sur un thème étroit, et l'on recopie sans le voir :
  // « Marlon Brando » était la réponse des niveaux 3 et 7 de la carte Cinéma.
  for (const carte of QUESTIONS.filter((q) => q.type === 'ttmc')) {
    const vus = new Map();
    carte.niveaux.forEach((n, i) => {
      const bonne = n.reponses[n.bonne].toLowerCase();
      assert.ok(
        !vus.has(bonne),
        `${carte.id} : niveaux ${vus.get(bonne)} et ${i + 1} répondent « ${bonne} »`,
      );
      vus.set(bonne, i + 1);
    });
  }
});

test('chaque thème a de quoi tenir une partie entière', () => {
  // Un thème choisi seul doit pouvoir remplir la plus longue partie proposée
  // dans les réglages. En dessous, le tirage rend moins de manches que promis.
  const PLUS_LONGUE_PARTIE = 12;
  for (const theme of THEMES) {
    const n = tailleDuPool([theme.id]);
    assert.ok(n >= PLUS_LONGUE_PARTIE, `${theme.nom} : ${n} questions, il en faut ${PLUS_LONGUE_PARTIE}`);
  }
});

test('un thème joué seul rend bien le nombre de manches demandé', () => {
  for (const theme of THEMES) {
    const tirage = tirerQuestions({ themes: [theme.id], nombre: 12 });
    assert.equal(tirage.length, 12, `${theme.nom} : ${tirage.length} manches sur 12`);
    assert.ok(tirage.every((q) => q.theme === theme.id), `${theme.nom} : une question d’un autre thème`);
  }
});

test('le mélange conserve le lien entre la bonne réponse et son texte', () => {
  const qcms = QUESTIONS.filter((q) => (q.type ?? 'qcm') === 'qcm');
  const attendu = new Map(qcms.map((q) => [q.id, q.reponses[q.bonne]]));
  const tirage = tirerQuestions({ themes: [], types: ['qcm'], nombre: qcms.length });
  assert.ok(tirage.length > 0);
  for (const manche of tirage) {
    assert.equal(manche.reponses[manche.bonne], attendu.get(manche.id));
  }
});

test('le mélange d’un classement garde la solution alignée sur les éléments', () => {
  const source = QUESTIONS.filter((q) => q.type === 'ordre');
  const tirage = tirerQuestions({ themes: [], types: ['ordre'], nombre: source.length });
  for (const manche of tirage) {
    const attendu = source.find((q) => q.id === manche.id).elements;
    assert.deepEqual(manche.solution.map((i) => manche.elements[i]), attendu);
  }
});

test('le mélange d’une rafale garde chaque verdict avec son affirmation', () => {
  const source = QUESTIONS.filter((q) => q.type === 'rafale');
  const tirage = tirerQuestions({ themes: [], types: ['rafale'], nombre: source.length });
  for (const manche of tirage) {
    const verite = new Map(
      source.find((q) => q.id === manche.id).affirmations.map((a) => [a.texte, a.vrai]),
    );
    manche.affirmations.forEach((texte, i) => {
      assert.equal(manche.solution[i], verite.get(texte), `${manche.id} : ${texte}`);
    });
  }
});

test('un tirage ne rend jamais deux fois la même question', () => {
  const tirage = tirerQuestions({ themes: [], nombre: 20 });
  assert.equal(new Set(tirage.map((q) => q.id)).size, tirage.length);
});

test('filtrer par thème restreint bien le tirage', () => {
  const tirage = tirerQuestions({ themes: ['musique'], nombre: 50 });
  assert.ok(tirage.length > 0);
  assert.ok(tirage.every((q) => q.theme === 'musique'));
  assert.equal(tirage.length, tailleDuPool(['musique']));
});

test('chaque joker a une description lisible', () => {
  for (const joker of JOKERS) {
    assert.ok(joker.nom && joker.emoji && joker.desc.length > 20);
  }
});

/* --- La boutique de packs ------------------------------------------------- */

const boutique = (method, query, body) => handlePackRequest({ method, query, body });

test('le catalogue est public, le contenu ne l’est pas', async () => {
  const vitrine = await boutique('GET', { licence: 'inconnue' });
  assert.equal(vitrine.status, 200);
  assert.ok(vitrine.body.packs.length > 0, 'au moins un pack installé');

  for (const pack of vitrine.body.packs) {
    assert.ok(pack.nom && pack.nombre > 0, `${pack.id} : vitrine incomplète`);
    assert.equal(pack.questions, undefined, `${pack.id} : les questions ont fuité dans le catalogue`);
    assert.equal(pack.possede, false);
  }

  const vol = await boutique('GET', { id: vitrine.body.packs[0].id, licence: 'inconnue' });
  assert.equal(vol.status, 402, 'un pack non acheté doit être refusé');
  assert.equal(vol.body.questions, undefined);
});

test('une licence qui a le pack en obtient le contenu', async () => {
  const { body: { packs: vitrine } } = await boutique('GET', {});
  const cible = vitrine[0].id;

  await accorder('licence-de-test', cible);
  const achat = await boutique('GET', { id: cible, licence: 'licence-de-test' });

  assert.equal(achat.status, 200);
  assert.ok(achat.body.questions.length > 0);
  // Et le catalogue le sait désormais.
  const apres = await boutique('GET', { licence: 'licence-de-test' });
  assert.equal(apres.body.packs.find((p) => p.id === cible).possede, true);
  // Sans changer quoi que ce soit pour les autres.
  const autre = await boutique('GET', { licence: 'quelqu-un-d-autre' });
  assert.equal(autre.body.packs.find((p) => p.id === cible).possede, false);
});

test('on ne s’accorde pas un pack tout seul par l’API', async () => {
  const { body: { packs: vitrine } } = await boutique('GET', {});
  const tentative = await boutique('POST', { id: vitrine[0].id }, { licence: 'pirate' });
  assert.equal(tentative.status, 403);

  const verif = await boutique('GET', { id: vitrine[0].id, licence: 'pirate' });
  assert.equal(verif.status, 402);
});

test('un pack inconnu répond 404, pas 402', async () => {
  const absent = await boutique('GET', { id: 'pack-qui-nexiste-pas', licence: 'peu-importe' });
  assert.equal(absent.status, 404);
});

test('les questions des packs sont valides comme celles de la banque', async () => {
  const { body: { packs: vitrine } } = await boutique('GET', {});
  for (const { id } of vitrine) {
    await accorder('verification', id);
    const { body } = await boutique('GET', { id, licence: 'verification' });

    for (const q of body.questions) {
      const type = typeDeManche(q.type);
      assert.ok(q.texte?.length > 3, `${q.id} : énoncé manquant`);
      assert.ok(q.note?.length > 10, `${q.id} : explication manquante`);
      assert.ok(THEMES.some((t) => t.id === q.theme), `${q.id} : thème inconnu`);
      // Préparable et notable, sinon la manche planterait en pleine soirée.
      const manche = type.preparer(q, (l) => l);
      assert.ok(type.solutionTexte(manche).length > 0, `${q.id} : pas de solution lisible`);
    }
  }
});

test('un pack ajouté entre dans le tirage sans toucher au jeu de base', () => {
  const avant = tailleDuPool([]);
  ajouterQuestions([{
    id: 'pack-essai-01',
    theme: 'culture',
    texte: 'Question venue d’un pack ?',
    reponses: ['Oui', 'Non', 'Peut-être', 'Sans avis'],
    bonne: 0,
    note: 'Elle vient bien d’un pack téléchargé.',
  }]);

  assert.equal(tailleDuPool([]), avant + 1);
  assert.ok(toutesLesQuestions().some((q) => q.id === 'pack-essai-01'));
  // Deux fois le même pack ne double pas la banque.
  ajouterQuestions([{ id: 'pack-essai-01', theme: 'culture', texte: 'x', reponses: [], bonne: 0 }]);
  assert.equal(tailleDuPool([]), avant + 1);

  oublierLesPacks();
  assert.equal(tailleDuPool([]), avant);
});

/* --- Relais -------------------------------------------------------------- */

const appel = (method, query, body) => handleRoomRequest({ method, query, body });

test('un salon se crée, s’ouvre aux pupitres et transmet les réponses', async () => {
  const cree = await appel('POST', {}, {});
  assert.equal(cree.status, 201);
  const { code, hostToken } = cree.body;
  assert.equal(code.length, 4);

  const arrivee = await appel('POST', { code, action: 'join' }, { playerId: 'a', name: 'Ana' });
  assert.equal(arrivee.status, 200);
  assert.equal(arrivee.body.players.length, 1);

  const publication = await appel('POST', { code }, { hostToken, state: { phase: 'manche' } });
  assert.equal(publication.status, 200);
  assert.equal(publication.body.version, 1);

  const lecture = await appel('GET', { code, since: 0 });
  assert.equal(lecture.body.changed, true);
  assert.deepEqual(lecture.body.state, { phase: 'manche' });

  // Rien de neuf depuis la version connue : la réponse ne renvoie pas l'état.
  const inchange = await appel('GET', { code, since: 1 });
  assert.equal(inchange.body.changed, false);
  assert.equal(inchange.body.state, undefined);

  await appel('POST', { code, action: 'answer' }, { playerId: 'a', round: 1, reponse: 2, elapsedMs: 900 });
  const battement = await appel('POST', { code }, { hostToken });
  assert.equal(battement.body.answers.length, 1);
  assert.equal(battement.body.answers[0].reponse, 2);

  // Les réponses relevées ne reviennent pas au battement suivant.
  const suivant = await appel('POST', { code }, { hostToken });
  assert.equal(suivant.body.answers.length, 0);
});

test('la même personne qui revient reprend sa place au lieu d’en créer une seconde', async () => {
  const { body: { code } } = await appel('POST', {}, {});
  await appel('POST', { code, action: 'join' }, { playerId: 'a', name: 'Ana' });
  const retour = await appel('POST', { code, action: 'join' }, { playerId: 'a', name: 'Ana' });
  assert.equal(retour.body.players.length, 1);
});

test('un pupitre ne peut pas publier l’état à la place de la régie', async () => {
  const { body: { code } } = await appel('POST', {}, {});
  const refus = await appel('POST', { code }, { hostToken: 'faux', state: { phase: 'podium' } });
  assert.equal(refus.status, 403);
});

test('le relais laisse passer toutes les formes de réponse, texte compris', async () => {
  // Le filtre du relais est le seul endroit qui puisse faire disparaître une
  // réponse en silence : une forme non prévue devient `null` et le joueur est
  // compté absent. C'est ce qui est arrivé au mix, dont les réponses sont du
  // texte. Un type de manche par ligne, et le jour où il en manque un, ça se voit.
  const { body: salon } = await appel('POST', {}, {});
  const { code, hostToken } = salon;
  await appel('POST', { code, action: 'join' }, { playerId: 'a', name: 'Ana' });

  const formes = [
    ['qcm', 2],
    ['estimation', 42195],
    ['ordre', [2, 0, 3, 1]],
    ['rafale', [true, false, true, true, false]],
    ['mix', 'Eye of the Tiger'],
  ];
  for (const [type, reponse] of formes) {
    await appel('POST', { code, action: 'answer' }, { playerId: 'a', round: 1, reponse, elapsedMs: 900 });
    const { body } = await appel('POST', { code }, { hostToken });
    assert.deepEqual(body.answers[0]?.reponse, reponse, `${type} : réponse perdue par le relais`);
  }

  // L'annonce de niveau voyage seule, sans réponse : c'est son propre champ, et
  // il s'était fait jeter en silence exactement comme le texte du mix.
  await appel('POST', { code, action: 'answer' }, { playerId: 'a', round: 1, niveau: 7 });
  const { body } = await appel('POST', { code }, { hostToken });
  assert.equal(body.answers[0]?.niveau, 7, 'ttmc : niveau perdu par le relais');
});

test('un titre trop long est tronqué, jamais jeté', async () => {
  const { body: salon } = await appel('POST', {}, {});
  const { code, hostToken } = salon;
  await appel('POST', { code, action: 'join' }, { playerId: 'a', name: 'Ana' });
  await appel('POST', { code, action: 'answer' }, { playerId: 'a', round: 1, reponse: 'x'.repeat(500) });
  const { body } = await appel('POST', { code }, { hostToken });
  assert.equal(typeof body.answers[0].reponse, 'string');
  assert.ok(body.answers[0].reponse.length <= 120);
});

test('un code inconnu répond 404 plutôt que d’ouvrir un salon vide', async () => {
  const absent = await appel('GET', { code: 'ZZZZ', since: 0 });
  assert.equal(absent.status, 404);
});

test('un prénom vide est refusé', async () => {
  const { body: { code } } = await appel('POST', {}, {});
  const refus = await appel('POST', { code, action: 'join' }, { playerId: 'a', name: '   ' });
  assert.equal(refus.status, 400);
});

/* --- Les nombres dits à voix haute ---------------------------------------- */
//
// Le modèle a lu « 1665 marches » comme une année : « seize soixante-cinq ».
// La correction n'est pas dans la banque — l'écran doit garder ses chiffres —
// mais sur le seul chemin de l'audio. Ces tests gardent les deux bouts : que
// les nombres partent bien en lettres, et qu'on n'écorche pas au passage les
// noms qui contiennent des chiffres.

test('les nombres s’écrivent en lettres, avec les règles françaises', () => {
  const cas = [
    [1665, 'mille six cent soixante-cinq'],   // le bug d'origine
    [0, 'zéro'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [80, 'quatre-vingts'],                    // le s tout seul
    [81, 'quatre-vingt-un'],                  // et pas « quatre-vingt et un »
    [200, 'deux cents'],
    [201, 'deux cent un'],                    // le s tombe dès qu'il suit quelque chose
    [1000, 'mille'],                          // jamais « un mille »
    [80000, 'quatre-vingt mille'],
    [42195, 'quarante-deux mille cent quatre-vingt-quinze'],
    [550000, 'cinq cent cinquante mille'],
  ];
  for (const [n, attendu] of cas) {
    assert.equal(entierEnLettres(n), attendu, `${n} mal écrit`);
  }
});

test('les séparateurs de milliers et les décimales passent', () => {
  assert.equal(direLesNombres('42 195 mètres'), 'quarante-deux mille cent quatre-vingt-quinze mètres');
  assert.equal(direLesNombres('1 600 marches'), 'mille six cents marches');
  assert.equal(direLesNombres('0,44 km²'), 'zéro virgule quarante-quatre km²');
  // Une virgule suivie d'une espace sépare deux nombres, elle n'est pas décimale.
  assert.equal(direLesNombres('1789, 1914'), 'mille sept cent quatre-vingt-neuf, mille neuf cent quatorze');
});

test('un chiffre collé à des lettres est un nom, pas une quantité', () => {
  // Tous vus dans la banque : les écrire donnerait « Udeux », « UBquarante »,
  // « B-cinquante-deux », « deux cent vingt et unB ».
  for (const nom of ['U2', 'UB40', 'The B-52s', 'PS2', 'MP3', '221B', 'Summer of ’69']) {
    assert.equal(direLesNombres(nom), nom, `${nom} ne devait pas être réécrit`);
  }
  // Mais un tiret entre deux nombres reste deux nombres.
  assert.equal(direLesNombres('Apollo 14'), 'Apollo quatorze');
});

test('les ordinaux se disent premier, cinquième, quatre-vingtième', () => {
  assert.equal(direLesNombres('Le 1ᵉʳ janvier'), 'Le premier janvier');
  assert.equal(direLesNombres('la 1ʳᵉ fois'), 'la première fois');
  assert.equal(direLesNombres('le 5ᵉ élément'), 'le cinquième élément');
  assert.equal(ordinalEnLettres(9), 'neuvième');
  assert.equal(ordinalEnLettres(21), 'vingt et unième');
  assert.equal(ordinalEnLettres(80), 'quatre-vingtième');   // le s tombe devant ième
});

test('l’inventaire audio ne laisse partir aucun chiffre, sauf les noms propres', () => {
  const restants = inventaire().filter((clip) => /\d/.test(clip.texte));
  // Ce qui reste doit être un nom : soit un chiffre collé à des lettres, soit
  // une liste de titres (le mix), jamais une quantité en toutes lettres.
  for (const clip of restants) {
    const nomPropre = clip.titres === true
      || /[\p{L}’'-]\d|\d[\p{L}]/u.test(clip.texte);
    assert.ok(nomPropre, `${clip.id} part au modèle avec un chiffre nu : ${clip.texte}`);
  }
});

test('ce qui s’affiche garde ses chiffres', () => {
  // La correction ne doit jamais avoir touché la banque : « 42 195 mètres » se
  // lit d'un coup d'œil, « quarante-deux mille cent quatre-vingt-quinze » non.
  const avecChiffres = QUESTIONS.filter((q) => /\d/.test(`${q.texte} ${q.note ?? ''}`));
  assert.ok(avecChiffres.length > 20, 'la banque devrait encore écrire en chiffres');
});

/* --- Le temps laissé à l'animateur ---------------------------------------- */
//
// Après une partie à deux, l'explication se faisait couper par l'annonce de la
// manche suivante. La cause : le budget de la révélation ne comptait que la
// réponse et l'explication, alors que l'animateur dit aussi son commentaire et,
// s'il s'en est passé une, la réplique de l'action marquante. Dès qu'un joker
// sortait, la phrase sautait — c'est-à-dire à toutes les manches intéressantes.

test('la révélation laisse le temps de tout ce que l’animateur enchaîne', () => {
  // Ce que l'appli fournit au moteur : la somme réelle des clips à jouer.
  const clip = { reponse: 4, note: 9, commentaire: 2.5, marquant: 4.5 };
  const appele = [];
  const regie = creerRegie({
    questions: troisQuestions(),
    dureeMs: DUREE,
    dureeRevelation: (question, resultat) => {
      appele.push(resultat);
      return (clip.reponse + clip.note + clip.commentaire + clip.marquant) * 1000;
    },
  });

  let horloge = 1_000_000;
  regie.lancer(horloge, [{ id: 'a', name: 'Ana' }]);
  for (let pas = 0; pas < 400 && regie.phase !== 'revelation'; pas += 1) {
    horloge += 100;
    regie.avancer(horloge, [{ id: 'a', name: 'Ana' }]);
  }
  assert.equal(regie.phase, 'revelation', 'la partie devait atteindre une révélation');

  // Le moteur passe bien le résultat : sans lui, l'appli ne peut pas connaître
  // la réplique de commentaire ni celle du joker, et sous-estime le passage.
  assert.ok(appele.length, 'dureeRevelation n’a pas été appelé');
  assert.ok(appele[0]?.commentaireCle, 'le résultat doit accompagner la question');

  const etat = regie.etatPublic([{ id: 'a', name: 'Ana' }]);
  const creneau = etat.finPhase - horloge;
  const aDire = (clip.reponse + clip.note + clip.commentaire + clip.marquant) * 1000;
  assert.ok(creneau >= aDire, `révélation de ${creneau} ms pour ${aDire} ms d’audio`);
});

test('le plafond de révélation couvre la plus longue explication de la banque', async () => {
  // Le plafond est un garde-fou contre un pack tiers, pas une coupure de
  // confort : le fixer sous le pire cas réel, c'est couper l'animateur en
  // pleine phrase — le bug qu'on vient de corriger.
  const { readFileSync } = await import('node:fs');
  let manifeste;
  try {
    manifeste = JSON.parse(readFileSync('web/quiz/audio/manifeste.json', 'utf8'));
  } catch {
    return;                                  // clips non générés : rien à vérifier
  }
  const duree = (id) => manifeste.clips[id] ?? 0;
  const maxDeLaCle = (cle) => {
    const ids = Object.keys(manifeste.clips).filter((i) => i.startsWith(`emcee/classique/${cle}/`));
    return ids.length ? Math.max(...ids.map(duree)) : 0;
  };
  // Le pire enchaînement : le commentaire le plus long, la réplique d'événement
  // la plus longue, puis la réponse et l'explication les plus longues.
  const pireCommentaire = Math.max(...['personne', 'tous', 'unSeul', 'plusieurs', 'plusProche',
    'partiel', 'mixTrouve', 'ttmcTrouve'].map(maxDeLaCle));
  const pireEvenement = Math.max(...['vol', 'sabotage', 'doubleReussi', 'doubleRate',
    'filTrouve'].map(maxDeLaCle));
  const pireQuestion = Math.max(...QUESTIONS
    .map((q) => duree(`reponse/${q.id}`) + duree(`note/${q.id}`)));

  const pire = (pireCommentaire + pireEvenement + pireQuestion) * 1000;
  assert.ok(
    PLAFOND_REVELATION_MS >= pire,
    `plafond de ${PLAFOND_REVELATION_MS} ms pour ${Math.round(pire)} ms d’audio au pire`,
  );
});

test('une réplique se budgète sur sa variante la plus longue', () => {
  // Chaque appareil tire sa variante au sort : la régie doit laisser le temps à
  // celui qui a tiré la plus longue, pas au premier venu.
  assert.equal(dureeDeLaReplique('classique', 'cleQuiNExistePas'), 0);
  assert.equal(dureeDeLaReplique('classique', undefined), 0,
    'une manche sans action marquante ne budgète rien');
});

/* --- L'annonce de manche -------------------------------------------------- */

test('l’annonce dit le numéro de la manche, puis une formule', () => {
  const { clips } = annonceDeManche('classique', 'avantManche', 7);
  assert.deepEqual(clips[0], 'emcee/classique/manche/7', 'le numéro vient en premier');
  assert.match(clips[1] ?? '', /^emcee\/classique\/avantManche\/\d+$/);

  // Les autres annonces n'ont pas de numéro : une seule réplique.
  assert.equal(annonceDeManche('classique', 'podium', 3).clips.length, 1);
  assert.equal(annonceDeManche('classique', 'ouverture', 0).clips.length, 1);

  // Une manche hors du format le plus grand ne réclame pas un clip inexistant.
  assert.equal(annonceDeManche('classique', 'avantManche', 99).clips.length, 1);
});

test('l’annonce rend le texte de ses propres clips', () => {
  // Le point de la fonction : un seul tirage pour l'oreille et pour l'écran.
  // Tant qu'ils venaient de deux banques séparées, on lisait « Manche 3 sur
  // 12 » en entendant « troisième question, prêts ? c'est parti ».
  const textes = new Map(inventaireDesParoles().map((c) => [c.id, c.texte]));
  for (const { id: persona } of PERSONAS) {
    for (const numero of [1, 4, 12]) {
      const { clips, texte } = annonceDeManche(persona, 'avantManche', numero);
      assert.equal(texte, clips.map((id) => textes.get(id)).join(' '),
        `${persona}, manche ${numero} : le texte annoncé ne dit pas ce que les clips disent`);
      assert.ok(texte.length, 'une annonce sans texte ne pourrait rien afficher');
    }
  }
});

test('chaque persona a de quoi ne pas se répéter sur douze manches', () => {
  for (const { id: persona } of PERSONAS) {
    const variantes = new Set();
    for (let i = 0; i < 400; i += 1) {
      variantes.add(annonceDeManche(persona, 'avantManche', 1).clips[1]);
    }
    assert.ok(variantes.size >= 6,
      `${persona} n’a que ${variantes.size} formules d’annonce`);
  }
});

test('les ordinaux gardent le s de trois, six et dix', () => {
  // « trois » perdait son s avec la règle de quatre-vingts : « troiième ».
  assert.equal(ordinalEnLettres(3), 'troisième');
  assert.equal(ordinalEnLettres(6), 'sixième');
  assert.equal(ordinalEnLettres(10), 'dixième');
  assert.equal(ordinalEnLettres(80), 'quatre-vingtième');
  assert.equal(ordinalEnLettres(200), 'deux centième');
});

test('l’annonce tient dans la fenêtre de jokers', async () => {
  // L'énoncé part au top et n'attend personne : une annonce plus longue que la
  // fenêtre se ferait couper par sa propre question.
  const { readFileSync } = await import('node:fs');
  let manifeste;
  try {
    manifeste = JSON.parse(readFileSync('web/quiz/audio/manifeste.json', 'utf8'));
  } catch {
    return;                                  // clips non générés : rien à vérifier
  }
  const duree = (id) => manifeste.clips[id] ?? 0;
  const maxSous = (prefixe) => {
    const ids = Object.keys(manifeste.clips).filter((i) => i.startsWith(prefixe));
    return ids.length ? Math.max(...ids.map(duree)) : 0;
  };
  // Le temps que met le lecteur à enchaîner deux clips, mesuré en pilotant une
  // vraie partie. Le compter change tout : sans lui, l'annonce paraît tenir
  // alors qu'elle se fait couper par son propre énoncé.
  const ENCHAINEMENT_S = 1.4;
  for (const { id: persona } of PERSONAS) {
    const numero = maxSous(`emcee/${persona}/manche/`);
    const formule = maxSous(`emcee/${persona}/avantManche/`);
    if (!numero || !formule) continue;       // clips pas encore régénérés
    const pire = numero + ENCHAINEMENT_S + formule;
    assert.ok(pire * 1000 <= DUREE_JOKERS_MS,
      `${persona} : annonce de ${pire.toFixed(1)} s pour une fenêtre de ${DUREE_JOKERS_MS / 1000} s`);
  }
});

test('l’ouverture tient dans la fenêtre d’intro', async () => {
  // Le jumeau du test ci-dessus, pour la toute première phrase de la soirée —
  // et il manquait. L'ouverture de l'animateur classique dure 5,36 s pour une
  // intro fixée à 5,5 s : elle se faisait couper par l'annonce de la manche 1,
  // le temps de rendre l'écran et de lancer la lecture.
  //
  // La fenêtre n'est plus fixe : `creerRegie` prend le plancher ou la longueur
  // du clip plus une respiration, selon ce qui est le plus long. On vérifie ici
  // que ce budget couvre vraiment le plus bavard des animateurs.
  const { readFileSync } = await import('node:fs');
  let manifeste;
  try {
    manifeste = JSON.parse(readFileSync('web/quiz/audio/manifeste.json', 'utf8'));
  } catch {
    return;                                  // clips non générés : rien à vérifier
  }
  const ENCHAINEMENT_S = 1.4;

  let mesures = 0;
  for (const { id: persona } of PERSONAS) {
    const ids = Object.keys(manifeste.clips).filter((i) => i.startsWith(`emcee/${persona}/ouverture/`));
    if (!ids.length) continue;
    mesures += 1;
    const clip = Math.max(...ids.map((i) => manifeste.clips[i]));
    // La fenêtre du moteur, pas une copie de sa formule.
    const fenetre = budgetDIntro(clip);
    assert.ok((clip + ENCHAINEMENT_S) * 1000 <= fenetre,
      `${persona} : ouverture de ${clip.toFixed(2)} s pour une fenêtre de ${fenetre / 1000} s`);
  }
  assert.ok(mesures > 0, 'aucune ouverture mesurée : le test ne prouve rien');
});

test('chaque animateur sait tout dire', () => {
  // Une clé oubliée ne casse rien de visible : `paroleDe` retombe en silence sur
  // le classique, et l'animateur change de personnage en pleine manche. C'est
  // exactement le genre de défaut qu'on ne voit qu'en jouant, d'où ce test.
  const parPersona = new Map();
  for (const clip of inventaireDesParoles()) {
    const [, persona, cle] = clip.id.split('/');
    if (!parPersona.has(persona)) parPersona.set(persona, new Set());
    parPersona.get(persona).add(cle);
  }
  const reference = parPersona.get('classique');
  assert.ok(reference?.size > 15, 'le classique sert de référence');

  for (const { id } of PERSONAS) {
    const siennes = parPersona.get(id);
    assert.ok(siennes, `${id} n’a aucune réplique`);
    const manquantes = [...reference].filter((cle) => !siennes.has(cle));
    assert.deepEqual(manquantes, [], `${id} ne sait pas dire : ${manquantes.join(', ')}`);
  }
});

test('aucune réplique prononcée ne contient de prénom', () => {
  // Les clips sont fabriqués une fois pour toutes : un gabarit `{nom}` y partirait
  // tel quel au modèle, qui prononcerait « accolade nom accolade ». Les prénoms
  // et les points restent à l'écran, c'est la règle de toute la banque parlée.
  for (const clip of inventaireDesParoles()) {
    assert.doesNotMatch(clip.texte, /\{\w+\}/, `${clip.id} contient un gabarit`);
  }
});

/* --- L'accès depuis l'application native ---------------------------------- */
//
// Emballée dans une app iOS, la page ne s'exécute plus sur le domaine du relais
// mais sur `capacitor://localhost` : chaque appel devient inter-origine. Sans
// en-tête d'autorisation, le navigateur les bloque tous et l'application se
// lance sans jamais pouvoir jouer. Mesuré sur le relais déployé avant
// correction : il répondait 201, sans un seul en-tête CORS.

test('le relais s’ouvre aux origines de l’application native', () => {
  for (const origine of ['capacitor://localhost', 'ionic://localhost', 'http://localhost']) {
    const entetes = enTetesCors(origine);
    assert.ok(entetes, `${origine} devrait être autorisée`);
    assert.equal(entetes['access-control-allow-origin'], origine);
    // Sans `Vary`, un cache pourrait servir à l'app la réponse préparée pour le site.
    assert.equal(entetes.vary, 'Origin');
  }
});

test('le préflight est reconnu, car chaque POST en est précédé', () => {
  // Le pupitre envoie ses réponses en `application/json`, ce qui suffit à
  // déclencher un OPTIONS préalable. Sans réponse à celui-là, la vraie requête
  // n'est jamais émise — et aucune réponse de joueur n'arrive.
  assert.equal(estPreflight('OPTIONS'), true);
  assert.equal(estPreflight('options'), true);
  assert.equal(estPreflight('POST'), false);
  assert.equal(estPreflight(undefined), false);
});

test('une origine inconnue n’obtient rien', () => {
  // La liste est explicite plutôt qu'une étoile : le relais n'a pas de compte à
  // protéger, mais n'importe quelle page du web pourrait sinon ouvrir des
  // salons chez nous.
  for (const origine of ['https://site-pirate.example', 'null', '', undefined]) {
    assert.equal(enTetesCors(origine), null, `${origine} ne devrait pas passer`);
  }
});

test('la fonction déployée pose bien les en-têtes, et pas seulement la librairie', async () => {
  // Le défaut n'était pas dans le calcul des en-têtes mais dans leur absence
  // totale du handler : c'est donc le handler qu'on exerce, avec une requête et
  // une réponse factices, comme Vercel l'appelle.
  const { default: handler } = await import('../api/room.mjs');

  const fausseReponse = () => {
    const entetes = {};
    const sortie = { entetes, code: 0, corps: null, termine: false };
    const self = {
      setHeader: (nom, valeur) => { entetes[nom] = valeur; },
      status: (code) => { sortie.code = code; return self; },
      json: (corps) => { sortie.corps = corps; return self; },
      end: () => { sortie.termine = true; return self; },
    };
    return { self, sortie };
  };

  // 1. Le préflight, qui précède chaque envoi de réponse d'un joueur.
  const pre = fausseReponse();
  await handler(
    { method: 'OPTIONS', url: '/api/room', headers: { origin: 'capacitor://localhost' } },
    pre.self,
  );
  assert.equal(pre.sortie.code, 204, 'le préflight doit être répondu');
  assert.equal(pre.sortie.entetes['access-control-allow-origin'], 'capacitor://localhost');

  // 2. La vraie requête : un salon se crée comme depuis le web.
  const post = fausseReponse();
  await handler(
    { method: 'POST', url: '/api/room', headers: { origin: 'capacitor://localhost' }, body: {} },
    post.self,
  );
  assert.equal(post.sortie.code, 201);
  assert.ok(post.sortie.corps?.code, 'le salon doit être créé');
  assert.equal(post.sortie.entetes['access-control-allow-origin'], 'capacitor://localhost');

  // 3. Depuis le web, rien ne change : aucun en-tête inter-origine.
  const web = fausseReponse();
  await handler({ method: 'POST', url: '/api/room', headers: {}, body: {} }, web.self);
  assert.equal(web.sortie.code, 201);
  assert.equal(web.sortie.entetes['access-control-allow-origin'], undefined);
});

/* --- La partie solo -------------------------------------------------------- */
//
// Jouer seul, c'est le même moteur avec un seul pupitre et le relais remplacé
// par une file en mémoire. Ce qui doit tenir côté moteur, c'est qu'une table
// d'un seul joueur aille jusqu'au podium sans se bloquer — notamment quand ce
// joueur ne répond pas, puisque la règle qui évite d'attendre un pupitre parti
// se chercher à boire viderait alors la liste des joueurs attendus.

test('une partie à un seul joueur va jusqu’au podium', () => {
  const solo = [{ id: 'seul', name: 'Toi' }];
  const { etatFinal, vues } = jouerUnePartie({
    questions: troisQuestions(),
    joueurs: solo,
    repondre: (public_) => (
      public_.phase === 'manche'
        ? [{ playerId: 'seul', round: public_.manche, reponse: 1, elapsedMs: 900 }]
        : []
    ),
  });
  assert.equal(etatFinal.phase, 'podium');
  assert.equal(etatFinal.podium?.[0]?.id, 'seul', 'le seul joueur gagne sa partie');
  assert.ok(vues.length > 3, 'la partie doit traverser ses manches');
});

test('un joueur seul qui ne répond jamais n’enlise pas la partie', () => {
  // La manche ne se clôt normalement qu'une fois tous les présents ayant
  // répondu — mais on cesse d'attendre celui qui s'est absenté plusieurs
  // manches. Seul, cela vide la liste des attendus : sans le garde-fou, la
  // partie se figerait là, et l'examinateur d'App Store verrait un écran mort.
  const solo = [{ id: 'seul', name: 'Toi' }];
  const { etatFinal } = jouerUnePartie({ questions: troisQuestions(), joueurs: solo });
  assert.equal(etatFinal.phase, 'podium', 'le chrono doit finir par emporter chaque manche');
});

/* --- Le paquet de l'application native ------------------------------------ */
//
// Le paquet iOS n'est pas une copie de `web/` : le quiz remonte à la racine, les
// modules partagés changent de place, et trois choses disparaissent. Chacun de
// ces déplacements peut casser un chemin — en silence, puisque l'application se
// lance quand même et n'échoue qu'au premier import manquant.
//
// Ces tests ne lisent le paquet que s'il a été bâti : `npm run build:ios`.

const paquetIos = () => {
  const { existsSync, readFileSync } = nodeFs;
  const racine = 'dist/ios';
  if (!existsSync(`${racine}/index.html`)) return null;
  return {
    racine,
    existe: (chemin) => existsSync(`${racine}/${chemin}`),
    lire: (chemin) => readFileSync(`${racine}/${chemin}`, 'utf8'),
  };
};

test('le paquet natif nomme son relais', () => {
  const paquet = paquetIos();
  if (!paquet) return;
  // Sans adresse explicite, l'appli chercherait l'API sur `capacitor://localhost`,
  // où il n'y en a aucune : le multijoueur partirait dans le vide.
  const page = paquet.lire('index.html');
  assert.match(page, /window\.QUIZ_RELAIS\s*=\s*"https:\/\//,
    'le relais doit être inscrit dans la page');
  // Et avant le script qui pourrait l'interroger.
  assert.ok(page.indexOf('QUIZ_RELAIS') < page.indexOf('js/app.js'),
    'le relais doit être posé avant le script de l’appli');
});

test('le paquet natif ne garde aucun chemin de la mise en page web', () => {
  const paquet = paquetIos();
  if (!paquet) return;
  // Le quiz est remonté d'un cran : `../icons/` et `../../js/` ne désignent
  // plus rien. Une icône manquante se voit ; un module manquant tue l'appli.
  for (const fichier of ['index.html', 'manifest.webmanifest']) {
    assert.doesNotMatch(paquet.lire(fichier), /\.\.\/icons\//,
      `${fichier} pointe encore vers les icônes du site`);
  }
  for (const module of nodeFs.readdirSync(`${paquet.racine}/js`)) {
    if (!module.endsWith('.js')) continue;
    assert.doesNotMatch(paquet.lire(`js/${module}`), /\.\.\/\.\.\/js\//,
      `js/${module} importe encore depuis l’arborescence du site`);
  }
});

test('le paquet natif embarque tout ce que l’appli demande', () => {
  const paquet = paquetIos();
  if (!paquet) return;
  for (const chemin of [
    'commun/ui.js', 'commun/speech.js',      // les deux modules partagés
    'icons/icon.svg', 'styles.css',
    'audio/manifeste.json',
    'js/app.js', 'js/engine.js', 'js/emcee.js', 'js/questions.js',
  ]) {
    assert.ok(paquet.existe(chemin), `${chemin} manque au paquet`);
  }
  // Les clips, c'est l'essentiel du poids et tout l'intérêt du hors-ligne.
  const manifeste = JSON.parse(paquet.lire('audio/manifeste.json'));
  const premier = Object.keys(manifeste.clips)[0];
  assert.ok(paquet.existe(`audio/${premier}.mp3`), 'les clips doivent être embarqués');
});

test('le paquet natif se passe du service worker et du réglage de relais', () => {
  const paquet = paquetIos();
  if (!paquet) return;
  // Un cache par-dessus le paquet ne pourrait que servir une version périmée.
  assert.equal(paquet.existe('sw.js'), false, 'le service worker n’a pas lieu d’être');
  // Et le champ « adresse du relais » est, dans une appli publiée, un bouton
  // pour tout casser. Son retrait a déjà cassé le démarrage une fois : le code
  // doit survivre à son absence.
  const page = paquet.lire('index.html');
  assert.doesNotMatch(page, /id="relay-url"/, 'le réglage de relais doit être retiré');
  assert.match(paquet.lire('js/app.js'), /if \(champRelais\)/,
    'l’appli doit tolérer l’absence du champ');
});

/* --- Les achats de l'App Store -------------------------------------------- */
//
// Un achat se falsifie en écrivant une ligne dans le stockage local : la seule
// chose qui vaille est la signature d'Apple, et elle voyage par un appareil qui,
// lui, n'est pas de confiance. Ces tests attaquent donc le vérificateur comme
// le ferait quelqu'un qui veut ouvrir les packs sans payer.
//
// Les transactions sont fabriquées avec une autorité de test complète (racine,
// intermédiaire, feuille en P-256) : on ne peut pas éprouver un refus avec de
// vraies transactions, puisque Apple n'émet jamais celles qu'on veut voir
// rejeter.

const avecAutorite = async (travail) => {
  const { fabriquerAutorite } = await import('./faux-apple.mjs');
  const autorite = fabriquerAutorite();
  try {
    definirRacine(autorite.racine);
    await travail(autorite);
  } finally {
    definirRacine(undefined);
    autorite.ranger();
  }
};

const BUNDLE = { bundleId: 'fr.quizentreamis.app' };

test('une transaction signée par Apple est acceptée', async () => {
  await avecAutorite(async (autorite) => {
    const { signerTransaction, transactionType } = await import('./faux-apple.mjs');
    const transaction = await verifierTransaction(
      signerTransaction(autorite, transactionType()), BUNDLE,
    );
    assert.equal(transaction.productId, 'fr.quizentreamis.pack.noel');
    assert.equal(transaction.transactionId, '2000000900000001');
  });
});

test('une transaction fabriquée par un tiers est refusée', async () => {
  // Le piège le plus facile : vérifier la signature sans épingler la racine.
  // N'importe qui peut signer un jeton et joindre ses propres certificats — la
  // chaîne est parfaitement cohérente, elle ne prouve que l'existence de son
  // auteur.
  await avecAutorite(async () => {
    const { fabriquerAutorite, signerTransaction, transactionType } = await import('./faux-apple.mjs');
    const pirate = fabriquerAutorite();
    try {
      await assert.rejects(
        verifierTransaction(signerTransaction(pirate, transactionType()), BUNDLE),
        /racine/i,
      );
    } finally {
      pirate.ranger();
    }
  });
});

test('une transaction retouchée après signature est refusée', async () => {
  await avecAutorite(async (autorite) => {
    const { signerTransaction, transactionType } = await import('./faux-apple.mjs');
    const bonne = signerTransaction(autorite, transactionType());
    const [entete, , signature] = bonne.split('.');

    // On remplace le pack acheté par l'autre, en gardant la vraie signature.
    const autre = Buffer
      .from(JSON.stringify(transactionType({ productId: 'fr.quizentreamis.pack.annees80-90' })))
      .toString('base64url');
    await assert.rejects(
      verifierTransaction(`${entete}.${autre}.${signature}`, BUNDLE), /[Ss]ignature/,
    );

    // Et une signature bricolée sur la bonne charge.
    await assert.rejects(
      verifierTransaction(`${bonne.slice(0, -4)}AAAA`, BUNDLE), /[Ss]ignature/,
    );
  });
});

test('une transaction authentique d’une autre application est refusée', async () => {
  // Elle est signée par Apple, sa chaîne est parfaite — et elle appartient à
  // quelqu'un d'autre. Sans ce contrôle, n'importe quel achat fait dans
  // n'importe quelle application ouvrirait nos packs.
  await avecAutorite(async (autorite) => {
    const { signerTransaction, transactionType } = await import('./faux-apple.mjs');
    await assert.rejects(
      verifierTransaction(signerTransaction(autorite, transactionType({ bundleId: 'com.autre.app' })), BUNDLE),
      /autre application/,
    );
  });
});

test('un achat remboursé ne donne plus droit à rien', async () => {
  await avecAutorite(async (autorite) => {
    const { signerTransaction, transactionType } = await import('./faux-apple.mjs');
    await assert.rejects(
      verifierTransaction(signerTransaction(autorite, transactionType({ revocationDate: Date.now() })), BUNDLE),
      /annulé ou remboursé/,
    );
  });
});

test('une chaîne tronquée ou rétrogradée est refusée', async () => {
  await avecAutorite(async (autorite) => {
    const { signerTransaction, transactionType } = await import('./faux-apple.mjs');
    const charge = transactionType();
    // La feuille seule : rien ne la relie à Apple.
    await assert.rejects(
      verifierTransaction(signerTransaction(autorite, charge, { x5c: [autorite.x5c[0]] }), BUNDLE),
      /Chaîne/,
    );
    // La racine retirée : la chaîne se tient, mais ne remonte nulle part.
    await assert.rejects(
      verifierTransaction(signerTransaction(autorite, charge, { x5c: autorite.x5c.slice(0, 2) }), BUNDLE),
      /racine/i,
    );
    // Et l'algorithme rétrogradé, le classique de JOSE.
    await assert.rejects(
      verifierTransaction(signerTransaction(autorite, charge, { alg: 'none' }), BUNDLE),
      /Algorithme/,
    );
  });
});

test('sans racine installée, la boutique refuse au lieu d’ouvrir', async () => {
  // Fermée par défaut : une configuration incomplète ne doit jamais se traduire
  // par des packs distribués gratuitement.
  definirRacine(null);
  try {
    const { fabriquerAutorite, signerTransaction, transactionType } = await import('./faux-apple.mjs');
    const autorite = fabriquerAutorite();
    try {
      await assert.rejects(
        verifierTransaction(signerTransaction(autorite, transactionType()), BUNDLE),
        (erreur) => erreur.status === 503,
      );
    } finally {
      autorite.ranger();
    }
  } finally {
    definirRacine(undefined);
  }
});

test('la route accorde les packs d’un achat vérifié, et refuse les autres', async () => {
  await avecAutorite(async (autorite) => {
    const { signerTransaction, transactionType } = await import('./faux-apple.mjs');
    const licence = `essai-${Date.now()}`;

    // Un achat valable, un produit qu'on ne vend pas, et une contrefaçon : le
    // refus de l'un ne doit pas coûter à l'utilisateur celui qu'il a payé.
    const pirate = (await import('./faux-apple.mjs')).fabriquerAutorite();
    let resultat;
    try {
      resultat = await handlePackRequest({
        method: 'POST',
        query: {},
        body: {
          licence,
          transactions: [
            signerTransaction(autorite, transactionType()),
            signerTransaction(autorite, transactionType({ productId: 'fr.quizentreamis.pack.inexistant' })),
            signerTransaction(pirate, transactionType()),
          ],
        },
      });
    } finally {
      pirate.ranger();
    }

    assert.equal(resultat.status, 200);
    assert.deepEqual(resultat.body.accordes, ['noel']);
    assert.equal(resultat.body.refuses.length, 2);
    assert.ok(resultat.body.packs.includes('noel'), 'le pack payé doit être ouvert');

    // Et le contenu sort maintenant pour cette licence, alors qu'il était fermé.
    const ouvert = await handlePackRequest({ method: 'GET', query: { id: 'noel', licence } });
    assert.equal(ouvert.status, 200);
    assert.ok(ouvert.body.questions?.length, 'le pack acheté doit être téléchargeable');

    const ferme = await handlePackRequest({ method: 'GET', query: { id: 'noel', licence: 'quelqu-un-d-autre' } });
    assert.equal(ferme.status, 402, 'et rester fermé pour une autre licence');
  });
});

test('la route sans transaction garde son secret partagé', async () => {
  // L'autre voie d'encaissement ne doit pas s'être ouverte au passage.
  const refus = await handlePackRequest({
    method: 'POST', query: { id: 'noel' }, body: { licence: 'x' },
  });
  assert.equal(refus.status, 403);
});

test('la racine épinglée est bien celle d’Apple', async () => {
  // Tout repose sur ce fichier : le remplacer, c'est ouvrir la boutique à qui
  // sait signer. Son empreinte est donc vérifiée, et non sa seule présence.
  definirRacine(undefined);
  const racine = await racineApple();
  if (!racine) return;                       // pas installée : rien à vérifier
  assert.equal(
    racine.fingerprint256,
    '63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79',
  );
  assert.match(racine.subject, /Apple Root CA - G3/);
  // Auto-signée, et valable au-delà de toute échéance raisonnable.
  assert.ok(racine.checkIssued(racine) && racine.verify(racine.publicKey));
  assert.ok(new Date(racine.validTo) > new Date('2030-01-01'));
});
