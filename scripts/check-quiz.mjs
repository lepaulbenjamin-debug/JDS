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
  resoudreManche, pointsDeRapidite, creerRegie, JOKERS, DUREE_COMPTE_MS,
} from '../web/quiz/js/engine.js';
import { QUESTIONS, tirerQuestions, tailleDuPool } from '../web/quiz/js/questions.js';
import { handleRoomRequest } from '../lib/rooms.js';

const QUESTION = {
  id: 'test', theme: 'culture',
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
  question: QUESTION,
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
    a: { choice: 0, elapsedMs: 1000, joker: null },
    b: { choice: 0, elapsedMs: 12000, joker: null },
  });
  assert.ok(detail.a.points > detail.b.points);
  assert.ok(detail.a.correct && detail.b.correct);
});

test('une mauvaise réponse ne rapporte rien, et n’enlève rien', () => {
  const { detail, scores } = manche(
    { a: { choice: 2, elapsedMs: 1000, joker: null } },
    { a: 500 },
  );
  assert.equal(detail.a.correct, false);
  assert.equal(detail.a.points, 0);
  assert.equal(scores.a, 500);
});

test('un joueur qui n’a pas répondu est marqué absent', () => {
  const { detail } = manche({ a: { choice: 0, elapsedMs: 500, joker: null } });
  assert.equal(detail.b.absent, true);
  assert.equal(detail.b.points, 0);
});

/* --- Jokers -------------------------------------------------------------- */

test('le sang-froid annule le barème dégressif', () => {
  const { detail } = manche({
    a: { choice: 0, elapsedMs: 14000, joker: 'sangfroid' },
    b: { choice: 0, elapsedMs: 14000, joker: null },
  });
  assert.equal(detail.a.points, 1000);
  assert.ok(detail.a.points > detail.b.points);
});

test('le 50/50 divise les points de la manche par deux', () => {
  const { detail } = manche({
    a: { choice: 0, elapsedMs: 0, joker: 'cinquante' },
    b: { choice: 0, elapsedMs: 0, joker: null },
  });
  assert.equal(detail.b.points, 1000);
  assert.equal(detail.a.points, 500);
});

test('le 50/50 ne rapporte rien si on se trompe quand même', () => {
  const { detail } = manche({ a: { choice: 1, elapsedMs: 0, joker: 'cinquante' } });
  assert.equal(detail.a.points, 0);
});

test('quitte ou double : doublé si juste, moitié perdue si faux', () => {
  const juste = manche({ a: { choice: 0, elapsedMs: 0, joker: 'double' } });
  assert.equal(juste.detail.a.points, 2000);

  const rate = manche(
    { a: { choice: 1, elapsedMs: 0, joker: 'double' } },
    { a: 900 },
  );
  assert.equal(rate.detail.a.points, -500);
  assert.equal(rate.scores.a, 400);
});

test('un total ne descend jamais sous zéro', () => {
  const { scores } = manche(
    { a: { choice: 1, elapsedMs: 0, joker: 'double' } },
    { a: 100 },
  );
  assert.equal(scores.a, 0);
});

test('le vol prend la moitié des points que le leader gagne sur la manche', () => {
  // Bo mène. Ana vole : Bo gagnerait 1000, il n'en garde que 500.
  const { detail, scores } = manche(
    {
      a: { choice: 0, elapsedMs: 3000, joker: 'vol' },
      b: { choice: 0, elapsedMs: 0, joker: null },
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
      a: { choice: 3, elapsedMs: 1000, joker: 'vol' },
      b: { choice: 0, elapsedMs: 0, joker: null },
    },
    { b: 2000 },
  );
  assert.equal(detail.b.points, 1000);
  assert.equal(detail.a.vol, undefined);
});

test('le sabotage efface ce que le leader gagne', () => {
  const { detail, scores } = manche(
    {
      a: { choice: 0, elapsedMs: 2000, joker: 'sabotage' },
      b: { choice: 0, elapsedMs: 0, joker: null },
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
      a: { choice: 0, elapsedMs: 2000, joker: 'vol' },
      b: { choice: 0, elapsedMs: 0, joker: null },
      c: { choice: 0, elapsedMs: 2000, joker: 'sabotage' },
    },
    { b: 3000 },
  );
  assert.equal(detail.a.vol, 500);
  assert.equal(detail.b.points, 0);
});

test('sans leader, vol et sabotage n’ont aucune cible', () => {
  const { detail } = manche({
    a: { choice: 0, elapsedMs: 1000, joker: 'vol' },
    b: { choice: 0, elapsedMs: 0, joker: null },
  });
  assert.equal(detail.a.vol, undefined);
  assert.equal(detail.b.points, 1000);
});

test('on ne peut pas se voler ni se saboter soi-même', () => {
  const { detail } = manche(
    { a: { choice: 0, elapsedMs: 0, joker: 'vol' } },
    { a: 5000 },
  );
  assert.equal(detail.a.vol, undefined);
  assert.equal(detail.a.points, 1000);
});

test('la manche finale vaut le double', () => {
  const { detail } = manche(
    { a: { choice: 0, elapsedMs: 0, joker: null } },
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
function jouerUnePartie({ questions, repondre, joueurs = JOUEURS, dureeMs = DUREE }) {
  const regie = creerRegie({ questions, dureeMs, persona: 'classique' });
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
          { playerId: 'a', round: vue.manche, choice: 0, elapsedMs: 100 },
          { playerId: 'c', round: vue.manche, choice: 1, elapsedMs: 100 },
        ];
      }
      if (depuis === 9000) {
        return [{ playerId: 'b', round: vue.manche, choice: 0, elapsedMs: 9000 }];
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
        ? [{ playerId: 'a', round: vue.manche, choice: 0, elapsedMs: 100 }]
        : [];
    },
  });
  assert.equal(etatFinal.phase, 'podium');
  // La manche n'a pas attendu les quinze secondes du chrono.
  assert.ok(mancheVueA < DUREE / 2, `la manche a duré ${mancheVueA} ms`);
});

test('un joker n’est consommé qu’une fois, et seulement s’il a été joué', () => {
  const { vues } = jouerUnePartie({
    questions: troisQuestions(),
    repondre: (vue, horloge) => {
      if (vue.phase !== 'manche' || horloge - vue.startAt !== 100) return [];
      return [{
        playerId: 'a', round: vue.manche, choice: 0, elapsedMs: 100,
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
      ? [{ playerId: 'a', round: 1, choice: 0, elapsedMs: 0 }]
      : []),
  });
  assert.equal(etatFinal.podium.every((j) => j.score === 0), true);
});

test('le décompte laisse le temps de poser son verre avant la question', () => {
  const regie = creerRegie({ questions: troisQuestions(), dureeMs: DUREE });
  regie.lancer(0, JOUEURS);
  let horloge = 0;
  while (regie.phase !== 'manche') {
    horloge += 100;
    regie.avancer(horloge, JOUEURS);
  }
  const vue = regie.etatPublic(JOUEURS);
  assert.equal(vue.startAt - horloge, DUREE_COMPTE_MS);
  assert.equal(vue.deadline - vue.startAt, DUREE);
});

/* --- Banque de questions ------------------------------------------------- */

test('chaque question a quatre réponses et une bonne valide', () => {
  for (const question of QUESTIONS) {
    assert.equal(question.reponses.length, 4, `${question.id} : quatre réponses attendues`);
    assert.ok(question.bonne >= 0 && question.bonne < 4, `${question.id} : index de bonne réponse`);
    assert.ok(question.note?.length > 10, `${question.id} : explication manquante`);
    assert.equal(new Set(question.reponses).size, 4, `${question.id} : réponses en double`);
  }
});

test('les identifiants de questions sont uniques', () => {
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('le mélange conserve le lien entre la bonne réponse et son texte', () => {
  const attendu = new Map(QUESTIONS.map((q) => [q.id, q.reponses[q.bonne]]));
  for (const question of tirerQuestions({ themes: [], nombre: QUESTIONS.length })) {
    assert.equal(question.reponses[question.bonne], attendu.get(question.id));
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

  await appel('POST', { code, action: 'answer' }, { playerId: 'a', round: 1, choice: 2, elapsedMs: 900 });
  const battement = await appel('POST', { code }, { hostToken });
  assert.equal(battement.body.answers.length, 1);
  assert.equal(battement.body.answers[0].choice, 2);

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
