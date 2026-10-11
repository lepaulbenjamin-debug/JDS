// La manche du DJ : un morceau passe sur l'enceinte, on trouve le titre et
// l'artiste.
//
// Le jeu ne diffuse rien. La musique sort de l'appli de l'hôte — Spotify,
// Deezer, Apple Music, peu importe — sur son abonnement à lui, dans son salon.
// C'est le modèle de Hitster, et c'est ce qui rend ce mode possible : une appli
// qui ferait elle-même entendre des extraits devrait les licencier, et aucun
// service de streaming n'autorise aujourd'hui un jeu à piocher dans son
// catalogue.
//
// D'où deux choses que les autres types ne font pas.
//
//   - Le départ est donné par le DJ, pas par l'horloge : la régie ne sait pas
//     quand la musique démarre. Tant qu'il n'a pas appuyé sur « Top », la manche
//     attend, et les jokers restent ouverts.
//   - Le verdict est rendu par le DJ, pas par une liste. Le jeu ne connaît pas
//     le morceau — il ne le connaît que si le DJ le tape, et même alors, « ACDC »
//     contre « AC/DC » ou un « feat. » oublié ne se tranchent pas à la machine.
//     Il pré-coche ce qu'il reconnaît ; le DJ confirme ou corrige d'un tap.
//     C'est aussi comme ça que se joue un vrai blind test : l'animateur valide.
//
// Les points : moitié pour le titre, moitié pour l'artiste. Trouver l'un sans
// l'autre rapporte, ce qui compte sur un morceau dont tout le monde fredonne le
// refrain sans savoir qui le chante.

import { reconnu } from './mix.js';

const LONGUEUR_MAX = 80;

const propre = (texte) => String(texte ?? '').trim().slice(0, LONGUEUR_MAX);

/**
 * Ce que le jeu peut cocher tout seul, avant que le DJ ne tranche.
 *
 * Généreux dans le même sens que le mix — un fragment de titre suffit — et pour
 * la même raison : personne ne tape « (I Can't Get No) Satisfaction » en entier
 * pendant que le refrain tourne. Le DJ décoche ce qui ne va pas.
 */
export function precocher(solution, valeur) {
  const titre = Boolean(solution?.titre && valeur?.titre
    && reconnu([{ titre: solution.titre }], valeur.titre));
  const artiste = Boolean(solution?.artiste && valeur?.artiste
    && reconnu([{ titre: solution.artiste }], valeur.artiste));
  return { titre, artiste };
}

/** Le texte de la solution, ou rien si le DJ ne l'a pas donnée. */
const enClair = (solution) => [solution?.titre, solution?.artiste].filter(Boolean).join(' — ');

export default {
  id: 'dj',
  nom: 'Blind test',
  emoji: '🎧',
  consigne: 'Écoute, puis donne le titre et l’artiste.',
  // Un extrait se laisse écouter : trente secondes au réglage normal.
  facteurDuree: 2,
  // La justesse d'abord, mais celui qui reconnaît à la troisième note mérite
  // mieux que celui qui attend le refrain.
  poidsVitesse: 0.5,
  // Pas d'énoncé à lire, pas de clip de réponse : ce que la table entend, c'est
  // la musique. Le moteur ne doit donc rien attendre, ni rien réclamer.
  lu: false,
  // Le top vient du DJ : voir `topDepart` dans le moteur.
  departManuel: true,

  preparer(entree) {
    return {
      id: entree.id,
      type: 'dj',
      theme: entree.theme ?? 'musique',
      texte: entree.texte ?? 'Quel est ce morceau ?',
      // Ce que le DJ passe, s'il le dit. Jamais publié avant la révélation.
      solution: null,
      verdicts: {},
    };
  },

  publier(manche, revele) {
    return revele ? { solution: manche.solution ?? null } : {};
  },

  // Un pupitre envoie `[titre, artiste]` : un tableau et non un objet, parce que
  // le relais ne laisse passer que des formes simples — un objet y arrivait
  // vidé, et la réponse ne comptait pas. La régie en refait un objet lisible.
  lire(brut) {
    if (!Array.isArray(brut) || brut.length !== 2) return null;
    const valeur = { titre: propre(brut[0]), artiste: propre(brut[1]) };
    return valeur.titre || valeur.artiste ? valeur : null;
  },

  noter(manche, reponses) {
    const notes = {};
    for (const id of Object.keys(reponses)) {
      const verdict = manche.verdicts?.[id] ?? {};
      const justes = (verdict.titre ? 1 : 0) + (verdict.artiste ? 1 : 0);
      notes[id] = {
        correct: justes === 2,
        fraction: justes / 2,
        justes,
        titreJuste: Boolean(verdict.titre),
        artisteJuste: Boolean(verdict.artiste),
      };
    }
    return notes;
  },

  cleCommentaire(notes) {
    const justes = notes.filter((n) => n.correct);
    if (justes.length && justes.length === notes.length && notes.length > 1) return 'tous';
    if (justes.length) return justes.length === 1 ? 'unSeul' : 'plusieurs';
    return notes.some((n) => n.fraction > 0) ? 'partiel' : 'personne';
  },

  solutionTexte(manche) {
    return enClair(manche.solution) || 'le morceau du DJ';
  },

  resume(manche, detail) {
    return enClair(detail?.valeur);
  },
};
