// L'animateur : sa voix, ses formules, ses jingles.
//
// Il n'improvise rien. C'est une banque de répliques à trous, tirées au sort et
// remplies avec ce qui vient de se passer dans la manche. Le choix est délibéré :
// une phrase choisie dans une liste part instantanément, fonctionne sans réseau,
// et ne dira jamais de bêtise en pleine soirée — trois choses qu'une génération
// à la volée ne garantit pas.
//
// Conséquence agréable : changer la personnalité de l'animateur, c'est changer
// de liste. Même moteur, trois ambiances.
//
// Une contrainte court dans toutes ces listes : aucune réplique ne fait d'accord
// sur un prénom. « Seul {nom} a trouvé » se trompe une fois sur deux, et un
// animateur qui mégenre un invité au milieu du salon casse la soirée. Les
// gabarits sont donc tournés pour rester neutres — « {nom}, et personne
// d'autre » plutôt que « la seule à avoir trouvé ».

import { speech } from '../../js/speech.js';

export const PERSONAS = [
  { id: 'classique', nom: 'Classique', desc: 'Le ton du plateau télé, sérieux et chaleureux.' },
  { id: 'chambreur', nom: 'Chambreur', desc: 'Il commente, il charrie, il n’épargne personne.' },
  { id: 'pincesansrire', nom: 'Pince-sans-rire', desc: 'Poli, lent, et légèrement méprisant.' },
];

const BANQUE = {
  classique: {
    ouverture: [
      'Bonsoir à tous, et bienvenue. {nb} candidats ce soir, et une seule place sur la première marche.',
      'Mesdames, messieurs, bonsoir. Vous êtes {nb} ce soir. Dans un quart d’heure, il n’en restera qu’un.',
    ],
    avantManche: [
      'Manche {manche} sur {total}.',
      'On enchaîne. Question {manche}.',
      'Question {manche} sur {total}. Concentration.',
    ],
    derniereManche: [
      'Dernière manche, et elle vaut double. Tout peut encore basculer.',
      'Voici la dernière question. Points doublés : accrochez-vous.',
    ],
    personne: [
      'Personne. Pas un seul. La réponse était {reponse}.',
      'Aucune bonne réponse. C’était {reponse}.',
    ],
    tous: [
      'Tout le monde a trouvé. {reponse}, évidemment.',
      'Sans faute pour tout le monde : {reponse}.',
    ],
    unSeul: [
      '{nom} a trouvé, et personne d’autre. Bravo.',
      'Une seule bonne réponse, celle de {nom}. Chapeau.',
    ],
    plusieurs: [
      '{nb} bonnes réponses. C’était bien {reponse}.',
      '{nb} d’entre vous ont trouvé : {reponse}.',
    ],
    rapide: [
      'Réponse la plus rapide : {nom}, en {secondes} secondes.',
      '{nom} a dégainé le plus vite : {secondes} secondes.',
    ],
    leader: [
      'En tête, {nom}, avec {points} points.',
      '{nom} prend la tête avec {points} points.',
    ],
    vol: [
      '{nom} sort le vol, et repart avec les points de {cible} !',
      'Vol réussi pour {nom}, aux dépens de {cible} !',
    ],
    sabotage: [
      '{nom} sabote {cible}, qui ne marquera rien cette manche.',
      'Sabotage de {nom} : {cible} repart les mains vides.',
    ],
    doubleReussi: ['{nom} avait doublé la mise, et ça paie.'],
    doubleRate: ['{nom} avait doublé la mise. Ça lui coûte cher.'],
    podium: [
      'Et le grand gagnant de la soirée, c’est {nom}, avec {points} points. Félicitations !',
      'Victoire de {nom}, {points} points. Bravo à tous.',
    ],
  },

  chambreur: {
    ouverture: [
      'Bon, vous êtes {nb}. Statistiquement, il y en a au moins deux qui vont le regretter.',
      'Salut la compagnie ! {nb} joueurs, un seul gagnant, et beaucoup d’excuses à préparer.',
    ],
    avantManche: [
      'Question {manche}. Allez, on se réveille.',
      'Manche {manche} sur {total}. Essayez de lire jusqu’au bout cette fois.',
      'Question {manche}. Celle-là, elle est cadeau. Enfin, normalement.',
    ],
    derniereManche: [
      'Dernière question, elle vaut double, et là c’est chacun pour soi.',
      'Dernière manche, points doublés. C’est le moment de trahir vos amis.',
    ],
    personne: [
      'Alors là, rien. Zéro. Le néant. C’était {reponse}, bande de touristes.',
      'Personne n’a trouvé. {reponse}. Vous me faites de la peine.',
    ],
    tous: [
      'Tout le monde a bon. Trop facile, je vais corser ça.',
      'Sans faute pour tout le monde. Bravo, vous savez lire.',
    ],
    unSeul: [
      '{nom} a trouvé. Les autres, vous étiez où ?',
      '{nom}, et personne d’autre. Le reste de la table a joué au hasard.',
    ],
    plusieurs: [
      '{nb} bonnes réponses. C’était {reponse}, pour ceux qui suivaient.',
      'On en a {nb}. Les autres, ce n’est pas grave, enfin si.',
    ],
    rapide: [
      '{nom} a dégainé en {secondes} secondes. Même pas le temps de lire la question.',
      'Plus rapide : {nom}, {secondes} secondes. Suspect.',
    ],
    leader: [
      '{nom} est en tête avec {points} points, et commence à être insupportable.',
      'Toujours {nom} devant, {points} points. Quelqu’un fait quelque chose ?',
    ],
    vol: [
      'Oh ! {nom} braque {cible} en pleine lumière ! Aucune pitié.',
      '{nom} pique les points de {cible}. L’amitié, c’était bien.',
    ],
    sabotage: [
      '{nom} sabote {cible}. Ambiance à table tout à l’heure.',
      'Sabotage sur {cible}, signé {nom}. On en reparlera au dessert.',
    ],
    doubleReussi: ['{nom} a doublé et ça passe. Quel culot.'],
    doubleRate: ['{nom} a doublé, et ça se termine mal. C’était magnifique.'],
    podium: [
      'C’est {nom} qui gagne, avec {points} points. Les autres, la revanche est dans le menu.',
      '{nom} remporte la soirée, {points} points. On va en entendre parler pendant des mois.',
    ],
  },

  pincesansrire: {
    ouverture: [
      'Bonsoir. Vous êtes {nb}. Nous verrons bien.',
      'Bien. {nb} participants. Commençons, tant que la motivation est là.',
    ],
    avantManche: [
      'Question {manche}.',
      'Manche {manche} sur {total}. Prenez votre temps. Enfin, non.',
    ],
    derniereManche: [
      'Dernière question. Elle vaut double, ce qui devrait suffire à réveiller le fond de la salle.',
      'Dernière manche, points doublés. Rien n’est joué, hélas.',
    ],
    personne: [
      'Aucune bonne réponse. C’était {reponse}. Je note.',
      'Rien. La réponse était {reponse}. Nous poursuivons.',
    ],
    tous: ['Tout le monde a trouvé. J’ajusterai la difficulté.'],
    unSeul: ['{nom}, et personne d’autre. Intéressant.'],
    plusieurs: ['{nb} bonnes réponses. C’était {reponse}.'],
    rapide: ['{nom}, en {secondes} secondes. Nous sommes tous impressionnés.'],
    leader: ['{nom} mène avec {points} points. Provisoirement.'],
    vol: ['{nom} dérobe les points de {cible}. C’est permis, je le rappelle.'],
    sabotage: ['{nom} bloque {cible}. Le règlement l’autorise. La morale, moins.'],
    doubleReussi: ['{nom} avait doublé. Bien vu.'],
    doubleRate: ['{nom} avait doublé. C’était audacieux.'],
    podium: [
      '{nom} l’emporte avec {points} points. Voilà.',
      'Vainqueur : {nom}, {points} points. Merci d’être venus.',
    ],
  },
};

/** Remplit les trous d'un gabarit : `{nom}` devient le prénom, et ainsi de suite. */
function remplir(gabarit, vars) {
  return gabarit.replace(/\{(\w+)\}/g, (_, cle) => String(vars?.[cle] ?? ''));
}

/**
 * Une réplique. On tire au sort dans la liste du personnage, avec un repli sur
 * le ton classique : une personnalité incomplète doit rester jouable plutôt que
 * de rendre l'animateur muet au milieu d'une manche.
 */
export function repliqueDe(persona, cle, vars = {}) {
  const liste = BANQUE[persona]?.[cle] ?? BANQUE.classique[cle];
  if (!liste?.length) return '';
  return remplir(liste[Math.floor(Math.random() * liste.length)], vars);
}

/* --- Voix ---------------------------------------------------------------- */

const VOIX_KEY = 'quizroom.voix';

export const voix = {
  get active() {
    try {
      return localStorage.getItem(VOIX_KEY) !== 'off';
    } catch {
      return true;
    }
  },
  set active(on) {
    try {
      localStorage.setItem(VOIX_KEY, on ? 'on' : 'off');
    } catch { /* navigation privée */ }
    if (!on) speech.stop();
  },
  get disponible() {
    return speech.supported;
  },
  /** Un animateur de quiz ne traîne pas : on parle plus vite que pour une règle. */
  dire(texte) {
    const lignes = [].concat(texte).filter(Boolean);
    if (!lignes.length || !this.active || !speech.supported) return;
    speech.speak(lignes, { rate: 1.08 });
  },
  taire() {
    speech.stop();
  },
};

/* --- Jingles ------------------------------------------------------------- */

// Synthétisés plutôt que chargés : quelques oscillateurs pèsent zéro octet,
// fonctionnent hors-ligne, et évitent d'embarquer des fichiers audio dont on
// n'a pas les droits.

let audio = null;

function contexte() {
  if (audio) return audio;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;
  audio = new Ctor();
  return audio;
}

function note(frequence, debut, duree, volume = 0.15, forme = 'sine') {
  const ctx = contexte();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = forme;
  osc.frequency.setValueAtTime(frequence, ctx.currentTime + debut);
  // Attaque et extinction douces : un créneau brut claque désagréablement dans
  // le haut-parleur d'un téléphone.
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + debut);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + debut + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + debut + duree);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + debut);
  osc.stop(ctx.currentTime + debut + duree + 0.05);
}

export const sons = {
  /**
   * Les navigateurs mobiles refusent de produire du son tant que l'utilisateur
   * n'a rien touché : à appeler depuis le premier vrai tap de la partie.
   */
  debloquer() {
    const ctx = contexte();
    if (ctx?.state === 'suspended') ctx.resume();
  },
  bip() { note(880, 0, 0.09, 0.1, 'triangle'); },
  top() { note(1320, 0, 0.16, 0.14, 'triangle'); },
  juste() {
    note(660, 0, 0.12);
    note(880, 0.1, 0.18);
  },
  faux() { note(150, 0, 0.28, 0.14, 'sawtooth'); },
  joker() {
    note(520, 0, 0.08, 0.12, 'square');
    note(780, 0.07, 0.08, 0.12, 'square');
    note(1040, 0.14, 0.14, 0.12, 'square');
  },
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.13, 0.4, 0.14, 'triangle'));
  },
};
