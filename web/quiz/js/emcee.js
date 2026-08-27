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

import { speech, frenchVoices } from '../../js/speech.js';
import * as audio from './audio.js';

export { charger as chargerLesClips, duree as dureeDuClip } from './audio.js';

export const PERSONAS = [
  { id: 'classique', nom: 'Classique', desc: 'Le ton du plateau télé, sérieux et chaleureux.' },
  { id: 'chambreur', nom: 'Chambreur', desc: 'Il commente, il charrie, il n’épargne personne.' },
  { id: 'pincesansrire', nom: 'Pince-sans-rire', desc: 'Poli, lent, et légèrement méprisant.' },
];

const BANQUE = {
  classique: {
    plusProche: [
      'Le plus proche, c’est {nom}. La réponse exacte : {reponse}.',
      'C’est {nom} qui s’en approche le plus. C’était {reponse}.',
    ],
    partiel: [
      'Personne n’a tout juste, mais il y a des points à ramasser.',
      'Pas de sans-faute. Des points quand même pour les plus proches.',
    ],
    filTrouve: ['Le fil rouge est tombé ! {nom} l’a démasqué.'],
    filManque: ['Et personne n’a vu le fil rouge de la soirée.'],
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
    mixTrouve: [
      '{nb} d’entre vous ont sorti un titre valable. Voici tout ce que j’acceptais.',
      'Bien joué. Et il y avait beaucoup d’autres réponses possibles — les voici.',
    ],
    mixPersonne: [
      'Aucun titre trouvé. Pourtant, regardez la liste.',
      'Personne. Et il y avait de quoi faire, jugez plutôt.',
    ],
    ttmcTrouve: [
      'Chacun avait sa question, et sa correction. Bonnes réponses : {nb}.',
      'Autant de questions que de joueurs. Bonnes réponses : {nb}. Regardez vos écrans.',
    ],
    ttmcGrosPari: [
      'Quelqu’un a joué gros et l’a emporté. {nom}, chapeau.',
      'Un gros pari tenu par {nom}. C’est comme ça qu’on renverse une partie.',
    ],
    ttmcPersonne: [
      'Personne. Vous vous êtes tous surestimés.',
      'Pas une bonne réponse. Le niveau était peut-être un peu haut.',
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
    plusProche: [
      '{nom} est le plus proche. C’était {reponse}, pour les autres.',
      'Le moins mauvais, c’est {nom}. La vraie réponse : {reponse}.',
    ],
    partiel: [
      'Aucun sans-faute. On prend ce qu’il y a.',
      'Personne n’a tout bon. J’ai vu pire. Rarement.',
    ],
    filTrouve: ['Et voilà, {nom} a trouvé le fil rouge. Les autres cherchent encore.'],
    filManque: ['Le fil rouge vous est passé sous le nez toute la soirée.'],
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
    mixTrouve: [
      '{nb} bonnes pioches. Et maintenant, la liste de tout ce que vous avez raté.',
      'Pas mal, {nom}. Les autres, lisez bien ce qui suit.',
    ],
    mixPersonne: [
      'Rien. Le vide. Et il y avait toute cette liste.',
      'Pas un titre. Je vous laisse méditer là-dessus.',
    ],
    ttmcTrouve: [
      'Rescapés : {nb}. Les autres, vous vous connaissez mal.',
      'Ceux qui savaient de quoi ils parlaient : {nb}. Les autres, non.',
    ],
    ttmcGrosPari: [
      '{nom} s’est mis très haut. Et {nom} avait raison. Insupportable.',
      'Gros pari, gros gain. {nom} vient de vous passer devant.',
    ],
    ttmcPersonne: [
      'Rien. Vous vous êtes tous mis trop haut, et ça se voit.',
      'Pas un seul. L’humilité, ça se travaille.',
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
    plusProche: ['{nom} s’en approche le plus. C’était {reponse}.'],
    partiel: ['Aucun sans-faute. Nous ferons avec.'],
    filTrouve: ['{nom} a trouvé le fil rouge. Il fallait bien quelqu’un.'],
    filManque: ['Le fil rouge n’a été trouvé par personne. Dommage.'],
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
    mixTrouve: ['{nb} réponse(s) recevable(s). La liste complète suit.'],
    mixPersonne: ['Aucune proposition recevable. La liste, elle, était fournie.'],
    ttmcTrouve: ['Bonnes réponses : {nb}, pour autant de questions distinctes.'],
    ttmcGrosPari: ['{nom} s’est placé haut, et l’a assumé. C’est notable.'],
    ttmcPersonne: ['Aucune bonne réponse. L’auto-évaluation est un art difficile.'],
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

/**
 * Ce que l'animateur PRONONCE, par opposition à ce qu'il affiche.
 *
 * Ces répliques-là ne contiennent ni prénom, ni score, ni bonne réponse : rien
 * qui varie d'une partie à l'autre. C'est la condition pour qu'elles existent
 * en fichiers audio pré-générés — on ne peut pas fabriquer à l'avance un clip
 * qui dit « Ana ». Les prénoms et les points restent à l'écran, comme dans une
 * vraie salle de quiz où la voix off commente et où le tableau porte les noms.
 *
 * La bonne réponse et son explication, elles, sont propres à chaque question :
 * elles ont leurs propres clips (`reponse/<id>`, `note/<id>`), enchaînés après
 * celui-ci.
 */
const DIT = {
  classique: {
    plusProche: ['Voici la réponse exacte.'],
    partiel: ['Aucun sans-faute, mais des points tout de même.'],
    filTrouve: ['Le fil rouge est tombé !'],
    filManque: ['Et personne n’a vu le fil rouge de la soirée.'],
    ouverture: ['Bonsoir à tous, et bienvenue. Dans un quart d’heure, il n’en restera qu’un.'],
    avantManche: [
      'Concentration.',
      'À vous de jouer.',
      'On y va.',
      'Attention.',
      'Écoutez bien.',
      'Silence dans la salle.',
      'Prêts ? C’est parti.',
      'Écoutez jusqu’au bout.',
    ],
    derniereManche: [
      'Dernière manche, et elle vaut double. Tout peut encore basculer.',
      'Voici la dernière question. Points doublés : accrochez-vous.',
      'On y est. Dernière question, points doublés.',
    ],
    mixTrouve: ['Voici tout ce que j’acceptais.'],
    mixPersonne: ['Aucun titre trouvé. Pourtant, regardez la liste.'],
    ttmcTrouve: ['Chacun avait sa question. Regardez vos écrans.'],
    ttmcGrosPari: ['Quelqu’un a joué gros et l’a emporté. Chapeau.'],
    ttmcPersonne: ['Personne. Vous vous êtes tous surestimés.'],
    personne: ['Personne. Pas un seul.', 'Aucune bonne réponse.'],
    tous: ['Tout le monde a trouvé.', 'Sans faute pour tout le monde.'],
    unSeul: ['Une seule bonne réponse. Chapeau.'],
    plusieurs: ['Plusieurs d’entre vous ont trouvé.'],
    vol: ['Vol réussi ! Le leader vient de perdre la moitié de ses points.'],
    sabotage: ['Sabotage ! Le leader ne marquera rien cette manche.'],
    doubleReussi: ['Quitte ou double, et ça paie.'],
    doubleRate: ['Quitte ou double, et ça coûte cher.'],
    podium: ['Voilà, c’est terminé. Le classement final est à l’écran. Bravo à tous !'],
  },

  chambreur: {
    plusProche: ['Le moins mauvais l’emporte. Voici la vraie réponse.'],
    partiel: ['Aucun sans-faute. On prend ce qu’il y a.'],
    filTrouve: ['Et voilà, le fil rouge est démasqué. Les autres cherchent encore.'],
    filManque: ['Le fil rouge vous est passé sous le nez toute la soirée.'],
    ouverture: ['Bon. Statistiquement, il y en a au moins deux qui vont le regretter.'],
    avantManche: [
      'Allez, on se réveille.',
      'Celle-là est cadeau. Normalement.',
      'Lisez jusqu’au bout, cette fois.',
      'On va voir qui suit vraiment.',
      'Bon courage. Il en faudra.',
      'Celle-ci va faire des dégâts.',
      'Concentrez-vous. Ça changerait.',
      'Pas de panique. Enfin, un peu.',
    ],
    derniereManche: [
      'Dernière question, elle vaut double. C’est le moment de trahir vos amis.',
      'Dernière manche, points doublés. Tout se joue là, et vous le savez.',
      'La dernière. Elle vaut double. Aucune excuse après ça.',
    ],
    mixTrouve: ['Et maintenant, la liste de tout ce que vous avez raté.'],
    mixPersonne: ['Rien. Le vide. Et il y avait toute cette liste.'],
    ttmcTrouve: ['Quelques rescapés. Les autres, vous vous connaissez mal.'],
    ttmcGrosPari: ['Gros pari, gros gain. Insupportable.'],
    ttmcPersonne: ['Rien. Vous vous êtes tous mis trop haut, et ça se voit.'],
    personne: ['Alors là, rien. Zéro. Le néant.', 'Personne n’a trouvé. Vous me faites de la peine.'],
    tous: ['Tout le monde a bon. Trop facile, je vais corser ça.'],
    unSeul: ['Une seule bonne réponse. Les autres, vous étiez où ?'],
    plusieurs: ['Quelques bonnes réponses. Les autres, ce n’est pas grave. Enfin si.'],
    vol: ['Oh ! Braquage en pleine lumière ! Aucune pitié.'],
    sabotage: ['Sabotage en règle. Ambiance à table tout à l’heure.'],
    doubleReussi: ['Doublé, et ça passe. Insolent.'],
    doubleRate: ['Doublé, et planté. C’était magnifique.'],
    podium: ['C’est fini. Le classement est à l’écran, et quelqu’un va en parler pendant des mois.'],
  },

  pincesansrire: {
    plusProche: ['Voici la réponse exacte.'],
    partiel: ['Aucun sans-faute. Nous ferons avec.'],
    filTrouve: ['Le fil rouge a été trouvé. Il fallait bien quelqu’un.'],
    filManque: ['Le fil rouge n’a été trouvé par personne. Dommage.'],
    ouverture: ['Bonsoir. Nous verrons bien.'],
    avantManche: [
      'Prenez votre temps. Enfin, non.',
      'Nous verrons bien.',
      'Je vous écoute.',
      'Si vous voulez bien.',
      'Un effort, peut-être.',
      'Voyons cela.',
      'Rien d’insurmontable. En principe.',
      'Bonne chance. Vous en aurez besoin.',
    ],
    derniereManche: [
      'Dernière manche, points doublés. Rien n’est joué, hélas.',
      'La dernière. Points doublés. Faites au mieux.',
      'Dernière question. Elle vaut double, ce qui ne changera peut-être rien.',
    ],
    mixTrouve: ['La liste complète suit.'],
    mixPersonne: ['Aucune proposition recevable. La liste, elle, était fournie.'],
    ttmcTrouve: ['Autant de questions que de joueurs. Les corrections sont à l’écran.'],
    ttmcGrosPari: ['Un pari haut, tenu. C’est notable.'],
    ttmcPersonne: ['Aucune bonne réponse. L’auto-évaluation est un art difficile.'],
    personne: ['Aucune bonne réponse. Je note.'],
    tous: ['Tout le monde a trouvé. J’ajusterai la difficulté.'],
    unSeul: ['Une seule bonne réponse. Intéressant.'],
    plusieurs: ['Quelques bonnes réponses.'],
    vol: ['Un vol. C’est permis, je le rappelle.'],
    sabotage: ['Un sabotage. Le règlement l’autorise. La morale, moins.'],
    doubleReussi: ['Doublé. Bien vu.'],
    doubleRate: ['Doublé. C’était audacieux.'],
    podium: ['Voilà. Le classement final est à l’écran. Merci d’être venus.'],
  },
};

/**
 * Le numéro de la manche, dit à voix haute.
 *
 * L'annonce ne disait jamais où l'on en était : elle tournait sur deux formules
 * générales, et au bout de douze manches on les connaissait par cœur. Un clip
 * par numéro règle les deux problèmes d'un coup — on sait où on en est, et
 * l'annonce change à chaque fois.
 *
 * Le chiffre s'écrit en chiffres : `scripts/generate-audio.mjs` le passe en
 * lettres avant de l'envoyer au modèle. Le total, lui, reste à l'écran, comme
 * les prénoms et les points — un clip par couple (manche, total) ferait quatre
 * cents fichiers pour dire ce qu'un bandeau affiche déjà.
 */
const MANCHES_MAX = 20;                        // le plus grand format proposé aux réglages

// L'ordinal, et non le cardinal : un animateur dit « septième question », pas
// « question sept » — et surtout pas « question un » pour ouvrir. Le féminin du
// premier compte (« première question »), les suivants sont invariables.
const numeroDeManche = (persona, n) => ({
  id: `emcee/${persona}/manche/${n}`,
  texte: `${n}${n === 1 ? 'ʳᵉ' : 'ᵉ'} question.`,
});

/**
 * Ce que l'animateur enchaîne pour lancer une manche : le numéro, puis une
 * formule tirée au sort. Les deux clips bout à bout tiennent largement dans la
 * fenêtre de jokers — c'est elle qui borne l'annonce, puisque l'énoncé part au
 * top et n'attend pas.
 */
export function annonceDeManche(persona, cle, numero) {
  if (cle !== 'avantManche') {
    const seul = paroleDe(persona, cle);
    return seul ? [seul.id] : [];
  }
  const nom = DIT[persona] ? persona : 'classique';
  const clips = [];
  if (Number.isInteger(numero) && numero >= 1 && numero <= MANCHES_MAX) {
    clips.push(numeroDeManche(nom, numero).id);
  }
  const fioriture = paroleDe(persona, 'avantManche');
  if (fioriture) clips.push(fioriture.id);
  return clips;
}

/**
 * Tous les clips d'annonce d'un personnage, à mettre en cache au lancement.
 *
 * L'annonce tient en deux clips, et charger le second prenait plus d'une
 * seconde : à trois secondes de formule, l'annonce du chambreur débordait de la
 * fenêtre de jokers et se faisait couper par son propre énoncé. Ils sont courts
 * et connus dès le début de la partie — autant les avoir sous la main.
 */
export function clipsDAnnonce(persona) {
  const nom = DIT[persona] ? persona : 'classique';
  const ids = [];
  for (let n = 1; n <= MANCHES_MAX; n += 1) ids.push(`emcee/${nom}/manche/${n}`);
  DIT[nom].avantManche.forEach((_, i) => ids.push(`emcee/${nom}/avantManche/${i}`));
  DIT[nom].derniereManche.forEach((_, i) => ids.push(`emcee/${nom}/derniereManche/${i}`));
  return ids;
}

/**
 * L'identifiant du clip à jouer pour une réplique, tiré au sort parmi les
 * variantes. Rend aussi le texte, qui sert de repli à la synthèse quand les
 * clips ne sont pas générés.
 */
export function paroleDe(persona, cle) {
  const liste = DIT[persona]?.[cle] ?? DIT.classique[cle];
  if (!liste?.length) return null;
  const index = Math.floor(Math.random() * liste.length);
  const nom = DIT[persona]?.[cle] ? persona : 'classique';
  return { id: `emcee/${nom}/${cle}/${index}`, texte: liste[index] };
}

/**
 * La durée de la plus longue variante d'une réplique.
 *
 * C'est bien le maximum qu'il faut, et non la moyenne : chaque appareil tire sa
 * variante au sort, et la régie doit laisser le temps à celui qui a tiré la
 * plus longue. Rend 0 si les clips ne sont pas générés — la partie retombe
 * alors sur le plancher, ce qui est le bon comportement.
 */
export function dureeDeLaReplique(persona, cle) {
  const liste = DIT[persona]?.[cle] ? DIT[persona][cle] : DIT.classique[cle];
  if (!liste?.length) return 0;
  const nom = DIT[persona]?.[cle] ? persona : 'classique';
  const durees = liste.map((_, i) => audio.duree(`emcee/${nom}/${cle}/${i}`));
  return Math.max(0, ...durees);
}

/** Tout ce qui doit être prononcé, pour le script de génération. */
export function inventaireDesParoles() {
  const clips = [];
  for (const [persona, cles] of Object.entries(DIT)) {
    for (const [cle, variantes] of Object.entries(cles)) {
      variantes.forEach((texte, index) => {
        clips.push({ id: `emcee/${persona}/${cle}/${index}`, texte });
      });
    }
    // Un clip par numéro de manche, jusqu'au plus grand format proposé.
    for (let n = 1; n <= MANCHES_MAX; n += 1) clips.push(numeroDeManche(persona, n));
  }
  return clips;
}

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
const TIMBRE_KEY = 'quizroom.timbre';

const lire = (cle) => {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
};
const ecrire = (cle, valeur) => {
  try {
    if (valeur == null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
  } catch { /* navigation privée */ }
};

export const voix = {
  /**
   * Par défaut, seule la régie parle.
   *
   * Sans cette règle, chaque téléphone récite la même phrase en même temps :
   * quatre voix de synthèse légèrement décalées, en canon, au milieu du salon.
   * L'animateur d'une salle de quiz est une voix dans la pièce, pas une par
   * personne. Chacun peut quand même l'activer sur son appareil — pratique si
   * la machine qui tient la régie n'a pas de haut-parleur.
   */
  appliquerDefaut(estRegie) {
    if (lire(VOIX_KEY) === null) ecrire(VOIX_KEY, estRegie ? 'on' : 'off');
  },

  get active() {
    return lire(VOIX_KEY) === 'on';
  },
  set active(on) {
    ecrire(VOIX_KEY, on ? 'on' : 'off');
    if (!on) speech.stop();
  },

  /** La voix système retenue, parmi celles installées sur cet appareil. */
  get timbre() {
    return lire(TIMBRE_KEY);
  },
  set timbre(uri) {
    ecrire(TIMBRE_KEY, uri || null);
  },
  get timbresDisponibles() {
    return frenchVoices();
  },

  get disponible() {
    return speech.supported;
  },

  /** Un animateur de quiz ne traîne pas : on parle plus vite que pour une règle. */
  dire(texte, { force = false } = {}) {
    const lignes = [].concat(texte).filter(Boolean);
    if (!lignes.length || !speech.supported) return;
    if (!force && !this.active) return;
    speech.speak(lignes, { rate: 1.08, voiceURI: this.timbre ?? undefined });
  },

  /**
   * Le passage complet : les clips pré-générés s'ils sont tous là, sinon la
   * synthèse du navigateur sur le texte de repli.
   *
   * Deux listes distinctes, et c'est délibéré : avec une vraie voix, on prend
   * le temps de lire l'explication de la réponse — c'est le meilleur moment de
   * la manche. Avec une voix de synthèse, ce même passage est celui qui lasse
   * le plus, donc le repli s'en tient au commentaire.
   *
   * Une règle en plus : une partie a UNE voix. Dès que la banque est là, un clip
   * qui manque ou qu'on n'a pas pu jouer laisse le silence — jamais la synthèse
   * du navigateur. Sinon l'animateur change de timbre en pleine soirée, et le
   * repli dit en plus autre chose que le clip (« Manche 3 sur 12 » là où la voix
   * enregistrée dit « On enchaîne »), ce qui s'entend immédiatement.
   */
  async enoncer({ clips = [], repli = [] } = {}) {
    if (!this.active) return;
    speech.stop();
    if (await audio.jouer(clips)) return;
    if (audio.disponible()) return;              // banque présente : silence plutôt qu'un autre timbre
    this.dire(repli);
  },

  /** Ce que la version pré-générée apporte : à afficher dans les réglages. */
  get clipsDisponibles() {
    return audio.disponible();
  },
  get nomDeLaVoix() {
    return audio.nomDeLaVoix();
  },

  precharger(clips) {
    if (this.active) audio.precharger(clips);
  },

  taire() {
    speech.stop();
    audio.taire();
  },
};

/* --- Jingles ------------------------------------------------------------- */

// Synthétisés plutôt que chargés : quelques oscillateurs pèsent zéro octet,
// fonctionnent hors-ligne, et évitent d'embarquer des fichiers audio dont on
// n'a pas les droits.

let contexteAudio = null;

function contexte() {
  if (contexteAudio) return contexteAudio;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;
  contexteAudio = new Ctor();
  return contexteAudio;
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
