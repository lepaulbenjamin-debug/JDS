// Les types de manche.
//
// Le moteur ne connaissait qu'une forme : quatre réponses, un tap, des points à
// la rapidité. Une soirée qui ne fait que ça s'essouffle — d'où un module par
// type, sur le modèle de `web/js/games/` pour le compteur de points : le moteur
// orchestre le temps et les scores, chaque module dit comment SA manche se
// prépare, s'affiche, se lit et se note.
//
// Le contrat d'un type :
//
//   id, nom, emoji, consigne   ce qu'on montre au joueur
//   facteurDuree               le chrono par rapport à un QCM : taper un nombre
//                              ou classer quatre éléments prend plus de temps
//                              que toucher un bouton
//   poidsVitesse               0 à 1 : combien la rapidité pèse dans les points.
//                              1 pour un QCM, 0 pour une estimation où c'est la
//                              justesse qui compte
//   preparer(entree, melanger) l'entrée de banque devient une manche jouable,
//                              mélange compris
//   publier(manche, revele)    ce qui part sur le relais — SANS la solution
//                              tant que le chrono tourne
//   lire(brut)                 normalise une réponse venue d'un pupitre
//   noter(manche, reponses)    toutes les réponses d'un coup, parce que
//                              certaines manches se notent les unes par rapport
//                              aux autres — au plus proche, par exemple
//   solutionTexte(manche)      la bonne réponse en clair, pour l'écran et pour
//                              l'annonce de l'animateur

import qcm from './qcm.js';
import estimation from './estimation.js';
import ordre from './ordre.js';
import rafale from './rafale.js';
import mix from './mix.js';

export const TYPES = [qcm, estimation, ordre, rafale, mix];

const PAR_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));

/** Le module d'un type. Repli sur le QCM : une banque ancienne reste jouable. */
export function typeDeManche(id) {
  return PAR_ID[id] ?? qcm;
}

export { qcm, estimation, ordre, rafale };
