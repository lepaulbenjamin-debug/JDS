// Vérifie les règles de la Quiz Room et le relais de salons.
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
} from '../web/quiz/js/engine.js';
import {
  QUESTIONS, THEMES, FILS_ROUGES, tirerQuestions, tailleDuPool, filRougeTrouve,
} from '../web/quiz/js/questions.js';
import { typeDeManche } from '../web/quiz/js/manches/index.js';
import { handleRoomRequest } from '../lib/rooms.js';

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

/* --- Le fil rouge --------------------------------------------------------- */

const FIL = FILS_ROUGES[0];

test('le fil rouge se reconnaît malgré la casse, les accents et les articles', () => {
  for (const essai of ['rouge', 'Le Rouge', 'LE ROUGE !', 'la couleur rouge', '  rouge  ']) {
    assert.ok(filRougeTrouve(FIL, essai), `« ${essai} » aurait dû passer`);
  }
  for (const essai of ['bleu', '', 'vert pomme', null]) {
    assert.ok(!filRougeTrouve(FIL, essai), `« ${essai} » n’aurait pas dû passer`);
  }
});

test('les questions du fil rouge sont réparties dans la partie, jamais groupées', () => {
  // Y compris sur une partie courte, où le fil pèse la moitié des manches.
  for (const nombre of [8, 12, 16, 20]) {
    const tirage = tirerQuestions({ themes: [], nombre, fil: FIL.id });
    const positions = tirage
      .map((q, i) => (QUESTIONS.find((e) => e.id === q.id)?.fil ? i : -1))
      .filter((i) => i >= 0);

    assert.equal(positions.length, 4, `${nombre} manches : les quatre questions du fil`);
    assert.ok(positions[0] >= 1, `${nombre} manches : jamais en toute première`);
    const ecarts = positions.slice(1).map((p, i) => p - positions[i]);
    assert.ok(ecarts.every((e) => e >= 2), `${nombre} manches, groupées : ${positions.join(', ')}`);
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

test('un code inconnu répond 404 plutôt que d’ouvrir un salon vide', async () => {
  const absent = await appel('GET', { code: 'ZZZZ', since: 0 });
  assert.equal(absent.status, 404);
});

test('un prénom vide est refusé', async () => {
  const { body: { code } } = await appel('POST', {}, {});
  const refus = await appel('POST', { code, action: 'join' }, { playerId: 'a', name: '   ' });
  assert.equal(refus.status, 400);
});
