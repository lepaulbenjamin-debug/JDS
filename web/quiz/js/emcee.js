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

import { speech, frenchVoices } from './speech.js';
import * as audio from './audio.js';

export {
  charger as chargerLesClips, duree as dureeDuClip,
  ajouterDesClips as declarerLesClipsDesPacks,
} from './audio.js';

export const PERSONAS = [
  { id: 'classique', nom: 'Classique', desc: 'Le ton du plateau télé, sérieux et chaleureux.' },
  { id: 'chambreur', nom: 'Chambreur', desc: 'Il commente, il charrie, il n’épargne personne.' },
  { id: 'pincesansrire', nom: 'Pince-sans-rire', desc: 'Poli, lent, et légèrement méprisant.' },
  { id: 'clasheur', nom: 'Clasheur', desc: 'Il ne chambre pas, il démolit. À réserver aux bons amis.' },
];

const BANQUE = {
  classique: {
    plusProche: [
      'Le plus proche, c’est {nom}. La réponse exacte : {reponse}.',
      'C’est {nom} qui s’en approche le plus. C’était {reponse}.',
      'Au plus près : {nom}. La réponse exacte était {reponse}.',
      'Personne n’est tombé pile. Au plus près, {nom} — c’était {reponse}.',
      'C’est {nom} qui limite l’écart. La réponse : {reponse}.',
    ],
    partiel: [
      'Personne n’a tout juste, mais il y a des points à ramasser.',
      'Pas de sans-faute. Des points quand même pour les plus proches.',
      'Pas de sans-faute, mais la table marque quand même.',
      'Aucun parcours parfait. Il y a tout de même des points à prendre.',
      'Personne n’a tout, personne n’a rien. C’est déjà ça.',
    ],
    filTrouve: ['Le fil rouge est tombé ! {nom} l’a démasqué.'],
    filManque: ['Et personne n’a vu le fil rouge de la soirée.'],
    ouverture: [
      'Bonsoir à tous, et bienvenue. {nb} candidats ce soir, et une seule place sur la première marche.',
      'Mesdames, messieurs, bonsoir. Vous êtes {nb} ce soir. Dans un quart d’heure, il n’en restera qu’un.',
    ],
    // Une clé à part, et pas un accord automatique sur {nb} : « 1 candidats »
    // n'est pas une faute de grammaire à rattraper, c'est une phrase écrite pour
    // une salle. Seul, on ne joue pas contre les autres mais contre soi, et
    // l'animateur doit le dire autrement. Les clips, eux, ne bougent pas :
    // `annonceCle` reste 'ouverture', et les répliques enregistrées ne comptent
    // déjà personne.
    ouvertureSolo: [
      'Bonsoir, et bienvenue. Ce soir, vous êtes seul en lice : contre le score, et contre vous-même.',
      'Mesdames, messieurs — enfin, vous. Une place sur la première marche, et un seul candidat pour la prendre.',
    ],
    avantManche: [
      'Manche {manche} sur {total}.',
      'On enchaîne. Question {manche}.',
      'Question {manche} sur {total}. Concentration.',
      'Manche {manche}. On écoute.',
      'Question {manche} sur {total}.',
      'On continue. Manche {manche} sur {total}.',
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
      'Rien du tout. La réponse était {reponse}.',
      'Pas une seule bonne réponse. C’était {reponse}.',
      'La table entière est passée à côté. C’était {reponse}.',
    ],
    tous: [
      'Tout le monde a trouvé. {reponse}, évidemment.',
      'Sans faute pour tout le monde : {reponse}.',
      'Personne ne s’est fait piéger : {reponse}.',
      'Carton plein pour la table. C’était {reponse}.',
      'Tout le monde y était. {reponse}, donc.',
    ],
    unSeul: [
      '{nom} a trouvé, et personne d’autre. Bravo.',
      'Une seule bonne réponse, celle de {nom}. Chapeau.',
      'Une seule bonne réponse ce coup-ci, et elle est signée {nom}.',
      'Seule bonne réponse : {nom}. Joli.',
      '{nom} passe, le reste de la table reste. Bravo.',
    ],
    plusieurs: [
      '{nb} bonnes réponses. C’était bien {reponse}.',
      '{nb} d’entre vous ont trouvé : {reponse}.',
      'On compte {nb} bonnes réponses : {reponse}.',
      '{nb} au tableau. La réponse était {reponse}.',
      '{nb} bonnes réponses, ni plus ni moins. C’était {reponse}.',
    ],
    rapide: [
      'Réponse la plus rapide : {nom}, en {secondes} secondes.',
      '{nom} a dégainé le plus vite : {secondes} secondes.',
      'Le doigt le plus rapide : {nom}, {secondes} secondes.',
      'Premier sur l’écran : {nom}, en {secondes} secondes.',
      '{nom} n’a pas hésité : {secondes} secondes.',
    ],
    leader: [
      'En tête, {nom}, avec {points} points.',
      '{nom} prend la tête avec {points} points.',
      'Toujours {nom} devant, avec {points} points.',
      'En haut du tableau : {nom}, {points} points.',
      '{nom} garde la première place avec {points} points.',
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
      'Au plus près, {nom}. Ce qui ne veut pas dire près. C’était {reponse}.',
      'Le moins loin : {nom}. La vraie réponse, {reponse}.',
    ],
    partiel: [
      'Aucun sans-faute. On prend ce qu’il y a.',
      'Personne n’a tout bon. J’ai vu pire. Rarement.',
      'Pas de sans-faute. On va dire que c’est l’intention qui compte.',
      'Aucun parcours parfait. Vous avez au moins essayé.',
      'Personne n’a tout bon. Je ne suis même pas surpris.',
    ],
    filTrouve: ['Et voilà, {nom} a trouvé le fil rouge. Les autres cherchent encore.'],
    filManque: ['Le fil rouge vous est passé sous le nez toute la soirée.'],
    ouverture: [
      'Bon, vous êtes {nb}. Statistiquement, il y en a au moins deux qui vont le regretter.',
      'Salut la compagnie ! {nb} joueurs, un seul gagnant, et beaucoup d’excuses à préparer.',
    ],
    ouvertureSolo: [
      'Bon, vous êtes tout seul. Statistiquement, ça va être serré.',
      'Salut ! Un joueur, un gagnant, un perdant. Bon courage pour cumuler les deux.',
    ],
    avantManche: [
      'Question {manche}. Allez, on se réveille.',
      'Manche {manche} sur {total}. Essayez de lire jusqu’au bout cette fois.',
      'Question {manche}. Celle-là, elle est cadeau. Enfin, normalement.',
      'Question {manche}. Concentrez-vous, pour une fois.',
      'Manche {manche} sur {total}. On y croit encore.',
      'Question {manche}. Pas de panique, ce ne sont que des points.',
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
      'Rien. Pas un. C’était {reponse}, au cas où ça intéresse quelqu’un.',
      'Zéro pointé pour toute la table. C’était {reponse}.',
      'Personne. {reponse}. On va dire que la question était piégeuse.',
    ],
    tous: [
      'Tout le monde a bon. Trop facile, je vais corser ça.',
      'Sans faute pour tout le monde. Bravo, vous savez lire.',
      'Tout le monde a bon. C’est louche.',
      'Sans faute général. Quelqu’un a triché, je le sens.',
      'Toute la table a trouvé. Je vais durcir le ton.',
    ],
    unSeul: [
      '{nom} a trouvé. Les autres, vous étiez où ?',
      '{nom}, et personne d’autre. Le reste de la table a joué au hasard.',
      'Bravo {nom}. Les autres, on fait comme si de rien n’était.',
      'Une seule bonne réponse : {nom}. Le reste, c’était de la décoration.',
      '{nom} sauve la table. Encore.',
    ],
    plusieurs: [
      '{nb} bonnes réponses. C’était {reponse}, pour ceux qui suivaient.',
      'On en a {nb}. Les autres, ce n’est pas grave, enfin si.',
      '{nb} bonnes réponses. C’était {reponse}, et c’était écrit en gros.',
      'On monte à {nb}. Un progrès, presque.',
      '{nb} d’entre vous ont trouvé {reponse}. Les autres improvisaient.',
    ],
    rapide: [
      '{nom} a dégainé en {secondes} secondes. Même pas le temps de lire la question.',
      'Plus rapide : {nom}, {secondes} secondes. Suspect.',
      '{nom} en {secondes} secondes. Soit avant d’avoir lu, j’imagine.',
      'Plus rapide : {nom}, {secondes} secondes. On vérifiera les caméras.',
      '{secondes} secondes pour {nom}. Les autres relisaient l’énoncé.',
    ],
    leader: [
      '{nom} est en tête avec {points} points, et commence à être insupportable.',
      'Toujours {nom} devant, {points} points. Quelqu’un fait quelque chose ?',
      '{nom} caracole en tête, {points} points. Ça commence à bien faire.',
      'En tête : {nom}, {points} points. Quelqu’un veut réagir, ou pas ?',
      '{nom} devant avec {points} points. Le suspense en prend un coup.',
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
    plusProche: [
      '{nom} s’en approche le plus. C’était {reponse}.',
      'Au plus près : {nom}. La réponse exacte, {reponse}.',
      'Personne n’est tombé juste. {nom} s’en rapproche. C’était {reponse}.',
      'L’écart le plus faible est celui de {nom}. C’était {reponse}.',
    ],
    partiel: [
      'Aucun sans-faute. Nous ferons avec.',
      'Aucun sans-faute. Des points tout de même.',
      'Pas de parcours parfait. Nous nous en contenterons.',
      'Personne n’a tout. Personne n’a rien non plus.',
    ],
    filTrouve: ['{nom} a trouvé le fil rouge. Il fallait bien quelqu’un.'],
    filManque: ['Le fil rouge n’a été trouvé par personne. Dommage.'],
    ouverture: [
      'Bonsoir. Vous êtes {nb}. Nous verrons bien.',
      'Bien. {nb} participants. Commençons, tant que la motivation est là.',
    ],
    ouvertureSolo: [
      'Bonsoir. Vous êtes seul. Nous verrons bien.',
      'Bien. Un participant. Commençons, tant que la motivation est là.',
    ],
    avantManche: [
      'Question {manche}.',
      'Manche {manche} sur {total}. Prenez votre temps. Enfin, non.',
      'Manche {manche} sur {total}.',
      'Question {manche}. Quand vous voudrez.',
      'Question {manche} sur {total}. Nous vous écoutons.',
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
      'Aucune bonne réponse. C’était {reponse}. Nous avancerons.',
      'Rien. C’était {reponse}. Je m’y attendais un peu.',
      'Pas une seule. La réponse : {reponse}. Continuons.',
    ],
    tous: [
      'Tout le monde a trouvé. J’ajusterai la difficulté.',
      'Tout le monde a bon. C’était {reponse}. La difficulté sera revue.',
      'Sans faute général. Je prends note, et je m’adapte.',
      'Toute la table a trouvé {reponse}. Cela arrive.',
      'Personne ne s’est trompé. Savourez, c’est rare.',
    ],
    unSeul: [
      '{nom}, et personne d’autre. Intéressant.',
      'Une seule bonne réponse, celle de {nom}. Notable.',
      '{nom} a trouvé. Le reste de la table, non.',
      'Seule bonne réponse : {nom}. Nous poursuivons.',
      '{nom}, et personne d’autre. C’est peu, mais c’est quelque chose.',
    ],
    plusieurs: [
      '{nb} bonnes réponses. C’était {reponse}.',
      '{nb} bonnes réponses. C’était {reponse}. Honorable.',
      'On compte {nb} réussites. La réponse était {reponse}.',
      '{nb} d’entre vous ont trouvé. C’était {reponse}.',
      '{nb} bonnes réponses. Ni triomphe, ni désastre.',
    ],
    rapide: [
      '{nom}, en {secondes} secondes. Nous sommes tous impressionnés.',
      '{nom}, {secondes} secondes. Rapide, en effet.',
      'Le plus vif : {nom}, {secondes} secondes. Notons-le.',
      '{secondes} secondes pour {nom}. C’est court.',
    ],
    leader: [
      '{nom} mène avec {points} points. Provisoirement.',
      'En tête : {nom}, {points} points. Pour l’instant.',
      '{nom} occupe la première place, {points} points. Cela peut changer.',
      'Premier au tableau : {nom}, avec {points} points.',
    ],
    vol: ['{nom} dérobe les points de {cible}. C’est permis, je le rappelle.'],
    sabotage: ['{nom} bloque {cible}. Le règlement l’autorise. La morale, moins.'],
    doubleReussi: ['{nom} avait doublé. Bien vu.'],
    doubleRate: ['{nom} avait doublé. C’était audacieux.'],
    podium: [
      '{nom} l’emporte avec {points} points. Voilà.',
      'Vainqueur : {nom}, {points} points. Merci d’être venus.',
    ],
  },

  // Le chambreur qui a cessé de se retenir. Le registre est celui de l'expression
  // toute faite — pas le couteau le plus aiguisé du tiroir, la lumière allumée
  // mais personne à la maison : ça vise le niveau au quiz, jamais la personne.
  // On reste donc à l'écart de tout ce qui touche au physique, aux origines ou à
  // quoi que ce soit qu'on ne choisit pas ; le seul sujet, c'est la réponse qui
  // vient d'être donnée. C'est aussi pour ça que le réglage annonce « à réserver
  // aux bons amis » : le ton se choisit en connaissance de cause.
  clasheur: {
    plusProche: [
      'Le moins catastrophique, c’est {nom}. La vraie réponse : {reponse}.',
      '{nom} s’en approche. De très loin, mais s’en approche. C’était {reponse}.',
      'Le moins loin, c’est {nom}. Ce qui en dit long. C’était {reponse}.',
      'Au plus près : {nom}. « Près » étant un grand mot. C’était {reponse}.',
      'Personne n’est tombé juste. {nom} limite la casse. C’était {reponse}.',
    ],
    partiel: [
      'Personne n’a tout bon. J’ai connu des tables pires. Une fois.',
      'Aucun sans-faute. On va faire semblant que c’était difficile.',
      'Pas de sans-faute. On va appeler ça un effort.',
      'Aucun parcours parfait. Le mot « parfait » était optimiste.',
      'Personne n’a tout bon. Je ne m’attendais pas à un miracle.',
    ],
    filTrouve: ['{nom} a trouvé le fil rouge pendant que les autres regardaient le plafond.'],
    filManque: ['Le fil rouge est passé devant vous toute la soirée. Vous avez regardé ailleurs.'],
    ouverture: [
      'Vous êtes {nb}. Ça fait {nb} occasions de se ridiculiser. Profitez-en.',
      'Bonsoir. {nb} joueurs, et déjà des doutes sur au moins la moitié.',
    ],
    ouvertureSolo: [
      'Tout seul ? Au moins, personne ne verra ça. Profitez-en.',
      'Bonsoir. Un joueur, et déjà des doutes. Ça commence bien.',
    ],
    avantManche: [
      'Question {manche}. Essayez de viser la bonne case.',
      'Manche {manche} sur {total}. On verra bien qui suit encore.',
      'Question {manche}. Celle-là va faire du dégât.',
      'Question {manche}. Tâchez de suivre.',
      'Manche {manche} sur {total}. Au point où vous en êtes.',
      'Question {manche}. Celle-là ne pardonne pas.',
    ],
    derniereManche: [
      'Dernière question, points doublés. Dernière chance de sauver l’honneur.',
      'Dernière manche, elle vaut double. Autant finir en beauté, ou en fanfare de casseroles.',
    ],
    mixTrouve: [
      '{nb} titres corrects. Le reste, c’était du vent. Voici la vraie liste.',
      'Bon, {nb} bonnes pioches. Maintenant, regardez tout ce qui vous est passé au-dessus.',
    ],
    mixPersonne: [
      'Zéro titre. Vous écoutez quoi, au juste ? Voici la liste.',
      'Rien. Pas un. Et il y avait tout ça.',
    ],
    ttmcTrouve: [
      'Bonnes réponses : {nb}. Les autres se sont surestimés, comme d’habitude.',
      '{nb} rescapés. Le reste de la table s’est envoyé des fleurs pour rien.',
    ],
    ttmcGrosPari: [
      '{nom} a misé haut et l’a tenu. Voilà quelqu’un qui se connaît, pour une fois.',
      'Gros pari tenu par {nom}. Prenez des notes, ça n’arrivera pas deux fois.',
    ],
    ttmcPersonne: [
      'Personne. Vous vous êtes tous mis très haut pour finir très bas.',
      'Pas une bonne réponse. L’écart entre ce que vous croyez savoir et la réalité fait peur.',
    ],
    personne: [
      'Rien. Le néant complet. C’était {reponse}, et ce n’était pas si dur.',
      'Personne. Pas le tiroir le mieux garni en couteaux, cette table. C’était {reponse}.',
      'Rien. Pas une. C’était {reponse}, et c’était écrit noir sur blanc.',
      'Zéro. La table au complet est passée à côté de {reponse}.',
      'Personne. {reponse}. Il va falloir réviser, et vite.',
    ],
    tous: [
      'Tout le monde a bon. Voilà, c’est fait, je peux corser la suite.',
      'Sans faute général. Je note la date, ça ne se reproduira pas.',
      'Tout le monde a bon. J’ai dû viser trop bas.',
      'Sans faute général. Ne vous emballez pas, ça ne durera pas.',
      'Toute la table a trouvé. Profitez, la suite pique.',
    ],
    unSeul: [
      '{nom} a trouvé. Un sur toute la table. La lumière était allumée chez une seule personne.',
      'Une seule bonne réponse : {nom}. Les autres, la question était pourtant écrite en français.',
      '{nom} a trouvé. Un. Sur toute la table.',
      'Une seule bonne réponse, et c’est celle de {nom}.',
      '{nom} sauve les meubles. Les autres ont bien travaillé le vide.',
    ],
    plusieurs: [
      '{nb} bonnes réponses. C’était {reponse}, pour ceux qui étaient réveillés.',
      'On en a {nb}. Les autres ont visé à côté de la plaque, et de la table.',
      '{nb} bonnes réponses. Les autres visaient une autre question, visiblement.',
      'On en compte {nb}. C’était {reponse}. Pour les autres, c’était pourtant marqué.',
      '{nb} au tableau. Le reste, on n’en parle pas.',
    ],
    rapide: [
      '{nom}, {secondes} secondes. Soit le temps qu’il a fallu aux autres pour finir de lire.',
      'Plus rapide : {nom} en {secondes} secondes. Le reste de la table rame encore.',
      '{nom}, {secondes} secondes. Les autres cherchent encore le bouton.',
      'Plus rapide : {nom} en {secondes} secondes. Le reste dormait.',
      '{secondes} secondes pour {nom}. Un record local, ne nous emballons pas.',
    ],
    leader: [
      '{nom} mène avec {points} points, et va devenir invivable.',
      'Toujours {nom} en tête, {points} points. Quelqu’un compte réagir ?',
      '{nom} écrase le tableau avec {points} points. Personne ne bouge ?',
      'En tête : {nom}, {points} points. Et un silence gêné.',
      '{nom} mène, {points} points. Le reste du classement est décoratif.',
    ],
    vol: [
      '{nom} braque {cible} en plein jour. Aucun remords, aucun témoin utile.',
      'Et voilà, {nom} rafle les points de {cible}. L’amitié aura duré une manche.',
    ],
    sabotage: [
      '{nom} sabote {cible}. Ça va se régler dehors, apparemment.',
      'Sabotage de {nom} sur {cible}. On vous laisse en discuter au dessert.',
    ],
    doubleReussi: ['{nom} a doublé et ça passe. Insupportable, mais mérité.'],
    doubleRate: ['{nom} a doublé et s’écrase en beauté. C’était magnifique à voir.'],
    podium: [
      '{nom} gagne avec {points} points. Les autres, il y a de la marge. Beaucoup de marge.',
      'Victoire de {nom}, {points} points. Le reste du classement, on va éviter d’en parler.',
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
    plusProche: [
      'Voici la réponse exacte.',
      'Personne n’est tombé pile. Voici la réponse.',
      'L’écart le plus faible l’emporte. Voici le nombre exact.',
      'Voici ce qu’il fallait dire.',
    ],
    partiel: [
      'Aucun sans-faute, mais des points tout de même.',
      'Pas de parcours parfait, mais la table marque.',
      'Personne n’a tout. Il y a des points quand même.',
      'Aucun sans-faute. Des points à ramasser malgré tout.',
    ],
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
      'Ouvrez grand les oreilles.',
      'Voici la suivante.',
      'Une nouvelle question pour vous.',
      'Restez concentrés.',
      'Pas de précipitation.',
      'Gardez votre sang-froid.',
      'On ne relâche rien.',
      'Chaque point compte.',
      'Tout le monde est prêt ?',
      'Question suivante, je vous prie.',
      'Attention, celle-ci est subtile.',
      'Prenez le temps de bien écouter.',
      'Voyons si vous suivez toujours.',
      'Le classement peut encore bouger.',
      'Bonne chance à tous.',
      'Et on reprend.',
    ],
    derniereManche: [
      'Dernière manche, et elle vaut double. Tout peut encore basculer.',
      'Voici la dernière question. Points doublés : accrochez-vous.',
      'On y est. Dernière question, points doublés.',
      'Nous y voilà : l’ultime question. Elle compte double.',
      'Dernière ligne droite, dernière question, et des points doublés.',
      'C’est la dernière. Points doublés, et rien n’est encore joué.',
    ],
    mixTrouve: ['Voici tout ce que j’acceptais.'],
    mixPersonne: ['Aucun titre trouvé. Pourtant, regardez la liste.'],
    ttmcTrouve: ['Chacun avait sa question. Regardez vos écrans.'],
    ttmcGrosPari: ['Quelqu’un a joué gros et l’a emporté. Chapeau.'],
    ttmcPersonne: ['Personne. Vous vous êtes tous surestimés.'],
    personne: [
      'Personne. Pas un seul.', 'Aucune bonne réponse.',
      'Rien du tout, cette fois.',
      'La table entière est passée à côté.',
    ],
    tous: [
      'Tout le monde a trouvé.', 'Sans faute pour tout le monde.',
      'Personne ne s’est fait piéger.',
      'Carton plein pour la table.',
    ],
    unSeul: [
      'Une seule bonne réponse. Chapeau.',
      'Une seule bonne réponse sur toute la table.',
      'Seule bonne réponse de la manche. Joli.',
      'Une réponse juste, et une seule.',
    ],
    plusieurs: [
      'Plusieurs d’entre vous ont trouvé.',
      'Plusieurs bonnes réponses au tableau.',
      'Vous êtes plusieurs à avoir vu juste.',
      'Il y a du monde sur la bonne réponse.',
    ],
    vol: [
      'Vol réussi ! Le leader vient de perdre la moitié de ses points.',
      'Vol réussi ! Une partie des points change de camp.',
      'Le vol passe. Les points ont changé de propriétaire.',
    ],
    sabotage: [
      'Sabotage ! Le leader ne marquera rien cette manche.',
      'Sabotage réussi. Cette manche ne rapportera rien.',
      'Le sabotage passe. Les points s’envolent.',
    ],
    doubleReussi: ['Quitte ou double, et ça paie.'],
    doubleRate: ['Quitte ou double, et ça coûte cher.'],
    podium: ['Voilà, c’est terminé. Le classement final est à l’écran. Bravo à tous !'],
    typeQcm: [
      'Retour au classique : quatre réponses, une seule bonne.',
      'Quatre propositions, une seule est juste.',
    ],
    typeEstimation: [
      'Place à l’estimation : un nombre, le plus près possible.',
      'Une estimation, maintenant. Personne n’a besoin d’être exact.',
    ],
    typeOrdre: [
      'Une manche de classement : remettez tout dans l’ordre.',
      'Quatre éléments à ranger, dans le bon ordre.',
    ],
    typeRafale: [
      'Rafale ! Vrai ou faux, et il faut aller vite.',
      'Une série de vrai ou faux. Enchaînez.',
    ],
    typeMix: [
      'Une réponse à taper, et plusieurs sont acceptées.',
      'Réponse libre : à vous de l’écrire.',
    ],
    typeTtmc: [
      'Tu te mets combien ? Choisissez votre niveau avant la question.',
      'À vous de parier sur votre niveau. Plus haut, plus de points.',
    ],
    miParcours: [
      'Nous passons la moitié de la partie.',
      'Mi-parcours. Tout reste possible.',
    ],
    ligneDroite: [
      'Nous entrons dans la dernière ligne droite.',
      'Plus que quelques questions. C’est maintenant que tout se joue.',
    ],
    coudeACoude: [
      'En tête, l’écart est minuscule.',
      'Le haut du classement se joue à un cheveu.',
    ],
    echappee: [
      'La tête du classement a pris le large. Il est temps de réagir.',
      'Un bel écart en tête. La poursuite est lancée.',
    ],
    themeCulture: ['Une question de culture générale.'],
    themeMusique: ['On parle musique.'],
    themeCinema: ['Direction le cinéma et les séries.'],
    themeAnnees2000: ['Retour dans les années deux mille.'],
    themeBouffe: ['Une question qui se mange.'],
    themeInsolite: ['Une question insolite.'],
    themeSport: ['Une question de sport.'],
    themeMonde: ['Un petit tour du monde.'],
    themeMarques: ['On parle marques et publicités.'],
    themeMots: ['Une question de mots et d’expressions.'],
    themeDisney: ['Un détour par Disney et Pixar.'],
    themeRegions: ['Cap sur les régions de France.'],
    themeNature: ['Une question de nature.'],
    themeHistoire: ['Un peu d’histoire.'],
    themeFake: ['Fake news, ou pas ? À vous de démêler.'],
    themePotter: ['Une question pour les sorciers : Harry Potter.'],
    themePokemon: ['Attention, dresseurs : une question Pokémon.'],
    themeCrimes: ['Une question sur les grandes affaires criminelles.'],
    themeGeopolitique: ['Une question de géopolitique.'],
    themeTelerealite: ['Direction la télé-réalité.'],
  },

  chambreur: {
    plusProche: [
      'Le moins mauvais l’emporte. Voici la vraie réponse.',
      'Au plus près. Ce qui ne veut pas dire près.',
      'Le moins loin l’emporte. Voici la vraie réponse.',
      'Personne n’est tombé pile. Loin de là.',
    ],
    partiel: [
      'Aucun sans-faute. On prend ce qu’il y a.',
      'Pas de sans-faute. C’est l’intention qui compte.',
      'Aucun parcours parfait. Vous avez au moins essayé.',
      'Personne n’a tout bon. Je ne suis même pas surpris.',
    ],
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
      'Rangez vos téléphones. Ah non, gardez-les.',
      'Celle-là, vous allez la rater avec style.',
      'On se concentre, je vois des yeux dans le vague.',
      'Allez, un petit effort collectif.',
      'Je sens que ça va être beau.',
      'Respirez. Ça va bien se passer. Peut-être.',
      'Ne regardez pas le voisin, il ne sait pas non plus.',
      'Celle-ci, je l’ai choisie pour vous.',
      'On arrête de bavarder.',
      'Allez, on montre ce qu’on sait faire.',
      'Je ne dis rien, mais je n’en pense pas moins.',
      'Que les meilleurs gagnent. Les autres aussi, un peu.',
      'Doigts sur l’écran, cerveau allumé si possible.',
      'Je sens comme une odeur de bonnet d’âne.',
      'Qui va encore se ridiculiser ?',
      'C’est reparti pour un tour.',
    ],
    derniereManche: [
      'Dernière question, elle vaut double. C’est le moment de trahir vos amis.',
      'Dernière manche, points doublés. Tout se joue là, et vous le savez.',
      'La dernière. Elle vaut double. Aucune excuse après ça.',
      'Dernière question, points doublés. Les excuses, c’est après.',
      'La dernière ! Elle vaut double, alors pas de bêtise.',
      'On termine en beauté, ou en catastrophe. Points doublés.',
    ],
    mixTrouve: ['Et maintenant, la liste de tout ce que vous avez raté.'],
    mixPersonne: ['Rien. Le vide. Et il y avait toute cette liste.'],
    ttmcTrouve: ['Quelques rescapés. Les autres, vous vous connaissez mal.'],
    ttmcGrosPari: ['Gros pari, gros gain. Insupportable.'],
    ttmcPersonne: ['Rien. Vous vous êtes tous mis trop haut, et ça se voit.'],
    personne: [
      'Alors là, rien. Zéro. Le néant.', 'Personne n’a trouvé. Vous me faites de la peine.',
      'Rien. Pas un. On va dire que la question était piégeuse.',
      'Zéro pointé pour toute la table.',
    ],
    tous: [
      'Tout le monde a bon. Trop facile, je vais corser ça.',
      'Tout le monde a bon. C’est louche.',
      'Sans faute général. Quelqu’un a triché, je le sens.',
      'Toute la table a trouvé. Je vais durcir le ton.',
    ],
    unSeul: [
      'Une seule bonne réponse. Les autres, vous étiez où ?',
      'Une seule bonne réponse. Le reste, c’était de la décoration.',
      'Une seule. Les autres, on fait comme si de rien n’était.',
      'Une bonne réponse sur toute la table. Ça sauve l’honneur.',
    ],
    plusieurs: [
      'Quelques bonnes réponses. Les autres, ce n’est pas grave. Enfin si.',
      'Quelques bonnes réponses. Un progrès, presque.',
      'Il y a du monde sur la bonne case, pour une fois.',
      'Plusieurs ont trouvé. Les autres improvisaient.',
    ],
    vol: [
      'Oh ! Braquage en pleine lumière ! Aucune pitié.',
      'Braquage réussi. L’amitié, c’était bien.',
      'Et hop, les points changent de poche. Aucun remords.',
    ],
    sabotage: [
      'Sabotage en règle. Ambiance à table tout à l’heure.',
      'Sabotage réussi. On en reparlera au dessert.',
      'Et voilà, sabotage. Ça va être tendu tout à l’heure.',
    ],
    doubleReussi: ['Doublé, et ça passe. Insolent.'],
    doubleRate: ['Doublé, et planté. C’était magnifique.'],
    podium: ['C’est fini. Le classement est à l’écran, et quelqu’un va en parler pendant des mois.'],
    typeQcm: [
      'Retour aux quatre cases. Une chance sur quatre, même pour vous.',
      'Un bon vieux QCM. Pas d’excuse.',
    ],
    typeEstimation: [
      'Une estimation. Visez à peu près, c’est votre spécialité.',
      'Un nombre à deviner. Personne ne tombera pile, rassurez-vous.',
    ],
    typeOrdre: [
      'Remettez-moi tout ça dans l’ordre. Si vous y arrivez.',
      'Un classement à faire. Pas de panique, il n’y a que quatre cases.',
    ],
    typeRafale: [
      'Rafale ! Vrai ou faux, sans réfléchir. Vous savez faire.',
      'Une rafale. Ça va vite, ne vous perdez pas.',
    ],
    typeMix: [
      'Réponse libre. Attention à l’orthographe, je regarde.',
      'À vous de taper la réponse. Sans faute, si possible.',
    ],
    typeTtmc: [
      'Tu te mets combien ? Soyez honnêtes avec vous-mêmes.',
      'Pariez sur votre niveau. Les vantards, je vous attends.',
    ],
    miParcours: [
      'Mi-temps ! Et certains n’ont toujours pas commencé.',
      'La moitié de la partie. Il est encore temps de se réveiller.',
    ],
    ligneDroite: [
      'Dernière ligne droite. C’est maintenant ou jamais.',
      'On approche de la fin. Sortez le grand jeu.',
    ],
    coudeACoude: [
      'En tête, ça se tient à rien. Ça va crier.',
      'Coude à coude en haut du classement. J’adore.',
    ],
    echappee: [
      'Quelqu’un s’envole en tête. Les autres, vous faites quoi ?',
      'La tête du classement file. Le reste regarde passer le train.',
    ],
    themeCulture: ['Culture générale. Ça va trier.'],
    themeMusique: ['Musique ! Pas besoin de chanter, merci.'],
    themeCinema: ['Cinéma et séries. Les accros aux plateformes, à vous.'],
    themeAnnees2000: ['Les années deux mille. Ça ne nous rajeunit pas.'],
    themeBouffe: ['On parle bouffe. Ne bavez pas sur l’écran.'],
    themeInsolite: ['Une question insolite. Préparez-vous à douter.'],
    themeSport: ['Sport ! Les sportifs de canapé, c’est votre moment.'],
    themeMonde: ['Un tour du monde. Sans bouger du canapé.'],
    themeMarques: ['Marques et pubs. Vous en avez avalé assez pour savoir.'],
    themeMots: ['Des mots et des expressions. Sortez le dictionnaire mental.'],
    themeDisney: ['Disney et Pixar. Pas de larmes, s’il vous plaît.'],
    themeRegions: ['Les régions de France. Le chauvinisme est autorisé.'],
    themeNature: ['La nature. Les citadins, accrochez-vous.'],
    themeHistoire: ['Un peu d’histoire. Réveillez vos souvenirs de cours.'],
    themeFake: ['Fake news ou pas ? Ne croyez pas tout ce que je dis.'],
    themePotter: ['Harry Potter. Les moldus, bon courage.'],
    themePokemon: ['Pokémon ! Attrapez la bonne réponse.'],
    themeCrimes: ['Les grandes affaires criminelles. Fermez bien la porte.'],
    themeGeopolitique: ['Géopolitique. Ceux qui lisent les journaux, à vous.'],
    themeTelerealite: ['Télé-réalité ! Ne faites pas semblant de ne pas regarder.'],
  },

  pincesansrire: {
    plusProche: [
      'Voici la réponse exacte.',
      'Personne n’est tombé juste. Voici la réponse exacte.',
      'L’écart le plus faible l’emporte. Voici le nombre.',
      'Voici ce qu’il fallait dire. Approximativement, pour certains.',
    ],
    partiel: [
      'Aucun sans-faute. Nous ferons avec.',
      'Aucun sans-faute. Des points tout de même.',
      'Pas de parcours parfait. Nous nous en contenterons.',
      'Personne n’a tout. Personne n’a rien non plus.',
    ],
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
      'Nous poursuivons.',
      'Une autre, puisque vous insistez.',
      'Écoutez, si ce n’est pas trop demander.',
      'Je reste optimiste. Modérément.',
      'Faites de votre mieux. C’est tout ce que je demande.',
      'Gardons notre calme.',
      'Concentrez-vous, pour la forme.',
      'Voici de quoi vous occuper.',
      'Une question, simplement.',
      'J’ai confiance. Plus ou moins.',
      'Tâchons de rester dignes.',
      'Ceci devrait être à votre portée.',
      'Continuons, voulez-vous.',
      'Je ne vous retiens pas.',
      'Je vous laisse la parole. Façon de parler.',
      'Allons-y, sans enthousiasme excessif.',
    ],
    derniereManche: [
      'Dernière manche, points doublés. Rien n’est joué, hélas.',
      'La dernière. Points doublés. Faites au mieux.',
      'Dernière question. Elle vaut double, ce qui ne changera peut-être rien.',
      'Dernière question. Elle compte double. Je suis aussi soulagé que vous.',
      'Nous arrivons au terme. Points doublés, pour le principe.',
      'L’ultime question. Elle vaut double. Faites-en bon usage.',
    ],
    mixTrouve: ['La liste complète suit.'],
    mixPersonne: ['Aucune proposition recevable. La liste, elle, était fournie.'],
    ttmcTrouve: ['Autant de questions que de joueurs. Les corrections sont à l’écran.'],
    ttmcGrosPari: ['Un pari haut, tenu. C’est notable.'],
    ttmcPersonne: ['Aucune bonne réponse. L’auto-évaluation est un art difficile.'],
    personne: [
      'Aucune bonne réponse. Je note.',
      'Aucune bonne réponse. Nous avancerons.',
      'Rien. Je m’y attendais un peu.',
      'Pas une seule. Continuons.',
    ],
    tous: [
      'Tout le monde a trouvé. J’ajusterai la difficulté.',
      'Tout le monde a bon. La difficulté sera revue.',
      'Sans faute général. Je prends note.',
      'Personne ne s’est trompé. Savourez, c’est rare.',
    ],
    unSeul: [
      'Une seule bonne réponse. Intéressant.',
      'Une seule bonne réponse. Notable.',
      'Une réponse juste, et une seule. Nous poursuivons.',
      'Une seule bonne réponse sur toute la table. C’est peu.',
    ],
    plusieurs: [
      'Quelques bonnes réponses.',
      'Plusieurs bonnes réponses. Honorable.',
      'Quelques réussites. Ni triomphe, ni désastre.',
      'Plusieurs d’entre vous ont trouvé. C’est déjà cela.',
    ],
    vol: [
      'Un vol. C’est permis, je le rappelle.',
      'Un vol aboutit. C’est permis, je le rappelle.',
      'Les points ont changé de mains. Le règlement l’autorise.',
    ],
    sabotage: [
      'Un sabotage. Le règlement l’autorise. La morale, moins.',
      'Un sabotage aboutit. Le règlement l’autorise. La morale, moins.',
      'Sabotage effectif. Cette manche ne rapportera rien.',
    ],
    doubleReussi: ['Doublé. Bien vu.'],
    doubleRate: ['Doublé. C’était audacieux.'],
    podium: ['Voilà. Le classement final est à l’écran. Merci d’être venus.'],
    typeQcm: [
      'Quatre réponses. Une seule est juste. Je précise.',
      'Retour aux propositions. C’est plus confortable pour tout le monde.',
    ],
    typeEstimation: [
      'Une estimation. L’exactitude n’est pas exigée, ce qui vous arrange.',
      'Un nombre à approcher. Approcher suffira.',
    ],
    typeOrdre: [
      'Un classement. Il y a un ordre, et ce n’est pas le vôtre.',
      'Quatre éléments à ordonner. Calmement.',
    ],
    typeRafale: [
      'Une rafale. Vrai ou faux. Rapidement, si possible.',
      'Plusieurs affirmations. Tranchez.',
    ],
    typeMix: [
      'Réponse libre. Je lirai tout, hélas.',
      'Une réponse à écrire. L’orthographe sera indulgente.',
    ],
    typeTtmc: [
      'Tu te mets combien. Évaluez-vous avec lucidité.',
      'Choisissez votre niveau. Votre estime de vous m’intéresse.',
    ],
    miParcours: [
      'Nous avons fait la moitié. Il en reste autant.',
      'Mi-parcours. Le temps passe, les points moins.',
    ],
    ligneDroite: [
      'La fin approche. Je le dis sans regret.',
      'Dernière ligne droite. Ne gâchez rien.',
    ],
    coudeACoude: [
      'En tête, l’écart est négligeable. Intéressant.',
      'Le haut du classement est très serré. Je n’en attendais pas tant.',
    ],
    echappee: [
      'La tête du classement s’est détachée. Les autres sont priés de réagir.',
      'Un écart important en tête. Je le constate.',
    ],
    themeCulture: ['Culture générale. Vaste programme.'],
    themeMusique: ['Musique. Je vous épargne le chant.'],
    themeCinema: ['Cinéma et séries. Vous avez dû en voir quelques-uns.'],
    themeAnnees2000: ['Les années deux mille. Une époque.'],
    themeBouffe: ['Gastronomie. Au sens large.'],
    themeInsolite: ['Une question insolite. Comme souvent ici.'],
    themeSport: ['Sport. Vous n’êtes pas obligés de vous lever.'],
    themeMonde: ['Le vaste monde. Voyons ce que vous en savez.'],
    themeMarques: ['Marques et publicités. Vous les connaissez mieux que vous ne le pensez.'],
    themeMots: ['La langue française. Prenez-en soin.'],
    themeDisney: ['Disney et Pixar. Retenez vos émotions.'],
    themeRegions: ['Les régions de France. Sans querelle de clocher, je vous prie.'],
    themeNature: ['La nature. Elle ne vous a rien fait.'],
    themeHistoire: ['L’histoire. Elle se répète, paraît-il.'],
    themeFake: ['Vrai ou faux. Méfiez-vous de tout, y compris de moi.'],
    themePotter: ['Harry Potter. Je suppose que certains attendaient cela.'],
    themePokemon: ['Pokémon. Je n’ai pas d’avis.'],
    themeCrimes: ['Affaires criminelles. Restons calmes.'],
    themeGeopolitique: ['Géopolitique. Sujet léger, comme toujours.'],
    themeTelerealite: ['Télé-réalité. Personne ne regarde, évidemment.'],
  },

  clasheur: {
    plusProche: [
      'Le moins catastrophique l’emporte. Voici la vraie réponse.',
      'Quelqu’un s’en est approché. De très loin. La réponse exacte, la voici.',
      'Le moins loin l’emporte. Ce qui en dit long.',
      'Personne n’est tombé juste. Très loin du compte, même.',
    ],
    partiel: [
      'Personne n’a tout bon. On va faire semblant que c’était difficile.',
      'Aucun sans-faute. J’ai connu des tables pires. Une fois.',
      'Pas de sans-faute. On va appeler ça un effort.',
      'Aucun parcours parfait. Le mot « parfait » était optimiste.',
    ],
    filTrouve: ['Le fil rouge est tombé, pendant que les autres regardaient le plafond.'],
    filManque: ['Le fil rouge est passé devant vous toute la soirée. Vous avez regardé ailleurs.'],
    ouverture: ['Bonsoir. Autant d’occasions de se ridiculiser que de joueurs. Profitez-en.'],
    avantManche: [
      'Visez la bonne case.',
      'On verra qui suit encore.',
      'Celle-là va faire du dégât.',
      'Attention, ça se corse.',
      'Un peu de tenue.',
      'Réveillez-vous.',
      'Concentration. Ça aiderait.',
      'Celle-là, on l’écoute en entier.',
      'Essayez de ne pas nous faire honte.',
      'Allez, réveillez le neurone de garde.',
      'Même un poisson rouge y arriverait. Peut-être.',
      'Ce n’est pas un test de QI, heureusement.',
      'Lisez lentement, ça évitera des dégâts.',
      'Concentrez-vous. Ça ne fait pas mal.',
      'Encore une occasion de briller. Ou pas.',
      'Faites semblant de savoir, ça rassure.',
      'On va encore rire, je le sens.',
      'Allumez la lumière, quelqu’un est peut-être à la maison.',
      'Respirez, ce n’est qu’une question.',
      'Prêts à vous planter ?',
      'Je mise sur un nouveau naufrage.',
      'Ne cherchez pas la réponse au plafond.',
      'Celle-là, même vous, vous pouvez.',
      'Préparez vos excuses à l’avance.',
    ],
    derniereManche: [
      'Dernière question, points doublés. Dernière chance de sauver l’honneur.',
      'Dernière manche, elle vaut double. Autant finir en beauté.',
      'La dernière, et elle vaut double. Il était temps.',
      'La dernière. Elle vaut double. Ne gâchez pas tout maintenant.',
      'Points doublés pour finir. Le ridicule compte double aussi.',
      'Dernière question, et elle vaut double. Prenez une grande inspiration.',
    ],
    mixTrouve: ['Voici la vraie liste. Regardez tout ce qui vous est passé au-dessus.'],
    mixPersonne: ['Zéro titre. Vous écoutez quoi, au juste ? Voici la liste.'],
    ttmcTrouve: ['Quelques rescapés. Le reste s’est envoyé des fleurs pour rien.'],
    ttmcGrosPari: ['Un gros pari, tenu. Voilà quelqu’un qui se connaît, pour une fois.'],
    ttmcPersonne: [
      'Personne. Vous vous êtes tous mis très haut pour finir très bas.',
      'Pas une bonne réponse. L’écart avec ce que vous croyez savoir fait peur.',
    ],
    personne: [
      'Rien. Le néant complet. Et ce n’était pas si dur.',
      'Personne. Pas le tiroir le mieux garni en couteaux, cette table.',
      'Rien. Le néant complet. Et ce n’était pas si dur.',
      'Zéro. La table au complet est passée à côté.',
    ],
    tous: [
      'Tout le monde a bon. Voilà, c’est fait. Je corse la suite.',
      'Sans faute général. Je note la date, ça ne se reproduira pas.',
      'Tout le monde a bon. J’ai dû viser trop bas.',
      'Sans faute général. Ne vous emballez pas, ça ne durera pas.',
    ],
    unSeul: [
      'Une seule bonne réponse. La lumière était allumée chez une seule personne.',
      'Un sur toute la table. La question était pourtant écrite en français.',
      'Une seule bonne réponse. Une. Sur toute la table.',
      'Une seule bonne réponse. Les autres ont bien travaillé le vide.',
    ],
    plusieurs: [
      'Quelques bonnes réponses, pour ceux qui étaient réveillés.',
      'Quelques-uns ont trouvé. Les autres ont visé à côté de la plaque.',
      'Quelques bonnes réponses. Les autres visaient ailleurs.',
      'Il y a du monde sur la bonne case. Le reste, on n’en parle pas.',
    ],
    vol: [
      'Braquage en plein jour. Aucun remords, aucun témoin utile.',
      'Braquage en plein jour. Aucun remords.',
      'Les points changent de camp. L’amitié aura duré une manche.',
    ],
    sabotage: [
      'Sabotage en règle. Ça va se régler dehors, apparemment.',
      'Sabotage en règle. Ça va se régler dehors, apparemment.',
      'Sabotage réussi. Cette manche ne rapportera rien du tout.',
    ],
    doubleReussi: ['Doublé, et ça passe. Insupportable, mais mérité.'],
    doubleRate: ['Doublé, et écrasé en beauté. C’était magnifique à voir.'],
    // « C'est fini » s'entend « ces filles » quand c'est dit vite : à éviter dans
    // une banque qui se garde de tout accord sur les joueurs.
    podium: ['Terminé. Le classement est à l’écran, et il y a de la marge. Beaucoup de marge.'],
    typeQcm: [
      'Quatre réponses. Même au hasard, vous avez vos chances.',
      'Un QCM. Le niveau minimum, pile pour vous.',
    ],
    typeEstimation: [
      'Une estimation. Visez large, c’est ce que vous faites de mieux.',
      'Un nombre à deviner. J’attends des réponses délirantes.',
    ],
    typeOrdre: [
      'Un classement. Remettez de l’ordre, ça vous changera.',
      'Quatre trucs à ranger. Comme une chambre, mais en plus dur.',
    ],
    typeRafale: [
      'Rafale. Vrai ou faux, et ne réfléchissez pas trop.',
      'Une série de vrai ou faux. Ça va piquer.',
    ],
    typeMix: [
      'Réponse libre. Je vais lire des horreurs, je le sens.',
      'À vous de taper. Les fautes seront relevées.',
    ],
    typeTtmc: [
      'Tu te mets combien ? Indice : moins que vous ne pensez.',
      'Pariez sur votre niveau. Je prévois des chutes.',
    ],
    miParcours: [
      'Mi-parcours. Certains n’ont toujours pas démarré.',
      'La moitié est faite. L’autre ne sera pas plus glorieuse.',
    ],
    ligneDroite: [
      'Dernière ligne droite. C’est maintenant qu’on voit qui craque.',
      'La fin approche, et le niveau ne remonte pas.',
    ],
    coudeACoude: [
      'En tête, ça se joue à rien. Enfin un peu de suspense.',
      'Coude à coude en haut. Le reste regarde le match.',
    ],
    echappee: [
      'La tête s’est envolée. Le peloton fait de la figuration.',
      'Un fossé en tête du classement. Le reste se bat pour l’honneur.',
    ],
    themeCulture: ['Culture générale. Votre point faible, je crois.'],
    themeMusique: ['Musique. Les oreilles, ça sert aussi à ça.'],
    themeCinema: ['Cinéma et séries. Enfin un sujet que vous avez travaillé.'],
    themeAnnees2000: ['Les années deux mille. Les souvenirs vont faire mal.'],
    themeBouffe: ['Bouffe. Le seul domaine où certains sont experts.'],
    themeInsolite: ['Insolite. Comme vos réponses, en général.'],
    themeSport: ['Sport. La télécommande ne compte pas comme une discipline.'],
    themeMonde: ['Le monde. Il est plus grand que votre quartier, vous allez voir.'],
    themeMarques: ['Marques et pubs. Tout ce temps d’écran va enfin servir.'],
    themeMots: ['Des mots. Ceux qu’on trouve dans les livres, oui.'],
    themeDisney: ['Disney et Pixar. Retour en enfance, votre niveau naturel.'],
    themeRegions: ['Les régions. Non, le canapé n’en est pas une.'],
    themeNature: ['La nature. Ce truc vert derrière la fenêtre.'],
    themeHistoire: ['Histoire. Ceux qui dormaient en cours, ça va se voir.'],
    themeFake: ['Fake news ou pas ? Vous qui croyez tout, régalez-vous.'],
    themePotter: ['Harry Potter. Même avec une baguette, ça ne suffira pas.'],
    themePokemon: ['Pokémon. Enfin une matière que vous avez révisée.'],
    themeCrimes: ['Affaires criminelles. Ne prenez pas de notes, ça m’inquiéterait.'],
    themeGeopolitique: ['Géopolitique. Le journal de vingt heures ne suffira pas.'],
    themeTelerealite: ['Télé-réalité. Enfin votre spécialité.'],
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
 * Ce que l'animateur enchaîne pour lancer une manche : le numéro, ce qui
 * distingue cette manche-ci, puis une formule tirée du sac.
 *
 * Le milieu est ce qui empêchait l'annonce de sonner toujours pareil. Le numéro
 * change mais ne dit rien, et une formule, même tirée parmi beaucoup, finit
 * par revenir. Ce qui ne revient pas, c'est la situation : on change de type de
 * manche, la partie bascule dans sa seconde moitié, deux joueurs se tiennent à
 * un cheveu en tête, la question porte sur Harry Potter. La régie propose ces
 * contextes par ordre de priorité ; on garde le premier qu'on sait dire.
 *
 * Rend les clips ET ce qu'ils disent, d'un seul tirage. C'est le point de la
 * fonction, et il vient d'un défaut : l'écran affichait une phrase tirée d'une
 * banque, la voix en jouait une autre tirée d'une seconde banque, et les deux
 * tirages étaient indépendants. On lisait « Manche 3 sur 12 » pendant qu'on
 * entendait « troisième question, prêts ? c'est parti ». Pire, chaque appareil
 * tirait le sien : deux téléphones dont la voix est activée ne disaient pas la
 * même chose. Un seul tirage, décidé par la régie et publié, règle les deux.
 *
 * `contexte` rend aussi, à part, ce qui a été retenu : la régie s'en sert pour
 * ne pas annoncer deux fois le même thème dans la soirée.
 */
export function annonceDeManche(persona, cle, numero, contextes = [], budgetMs = Infinity) {
  const nom = DIT[persona] ? persona : 'classique';
  const clips = [];
  const morceaux = [];
  const ajouter = (dit) => {
    if (!dit) return;
    clips.push(dit.id);
    morceaux.push(dit.texte);
  };

  if (cle === 'avantManche' && Number.isInteger(numero) && numero >= 1 && numero <= MANCHES_MAX) {
    ajouter(numeroDeManche(nom, numero));
  }
  // La dernière manche a sa propre phrase, qui ouvre ; le contexte vient après.
  if (cle !== 'avantManche') ajouter(paroleDe(persona, cle));

  const contexte = contextes.find((c) => contexteDicible(nom, c)) ?? null;
  const ditDuContexte = contexte ? paroleDe(nom, contexte) : null;
  ajouter(ditDuContexte);

  // La formule ferme l'annonce, et c'est elle qui saute si le temps manque :
  // l'énoncé part au top sans attendre, et une annonce trop longue se fait
  // couper par sa propre question. Le contexte, lui, dit quelque chose.
  if (cle === 'avantManche') {
    const formule = paroleDe(persona, 'avantManche');
    const deja = clips.reduce((t, id, i) => t + dureeEstimee(id, morceaux[i]), 0);
    if (formule && deja + dureeEstimee(formule.id, formule.texte) <= budgetMs) ajouter(formule);
  }
  return { clips, texte: morceaux.join(' '), contexte, texteDuContexte: ditDuContexte?.texte ?? '' };
}

/**
 * La durée d'un morceau d'annonce, en millisecondes : celle du clip quand on
 * l'a, sinon une estimation au mot — un peu large, pour ne jamais couper. Les
 * deux tiennent compte du blanc entre deux clips.
 */
const BLANC_ENTRE_CLIPS_MS = 250;
const MS_PAR_MOT = 380;

export function dureeEstimee(id, texte) {
  const mesuree = audio.duree(id);
  const mots = String(texte ?? '').split(/\s+/).filter(Boolean).length;
  return (mesuree ? mesuree * 1000 : mots * MS_PAR_MOT) + BLANC_ENTRE_CLIPS_MS;
}

/**
 * Un contexte se dit s'il existe pour ce personnage et, quand les
 * enregistrements sont en service, s'il est enregistré. Sinon on passe au
 * suivant, puis à rien : une annonce sans contexte reste une annonce, une
 * annonce muette n'en est plus une.
 */
function contexteDicible(nom, cle) {
  const liste = DIT[nom]?.[cle];
  if (!liste?.length) return false;
  if (!audio.enService()) return true;
  return liste.some((_, i) => audio.existe(`emcee/${nom}/${cle}/${i}`));
}

/** La clé de contexte d'un type de manche : `typeEstimation`, `typeTtmc`… */
export const cleDuType = (type) => `type${type[0].toUpperCase()}${type.slice(1)}`;

/** La clé de contexte d'un thème : `themeCinema`, `themeTelerealite`… */
export const cleDuTheme = (theme) => `theme${theme[0].toUpperCase()}${theme.slice(1)}`;

/** Les contextes de situation, dans l'ordre où la régie les considère. */
export const SITUATIONS = ['miParcours', 'ligneDroite', 'coudeACoude', 'echappee'];

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
  // Les formules, et tous les contextes : une annonce en compte jusqu'à trois
  // bout à bout, et le troisième ne doit pas arriver après le top.
  for (const [cle, variantes] of Object.entries(DIT[nom])) {
    const dAnnonce = cle === 'avantManche' || cle === 'derniereManche'
      || cle.startsWith('type') || cle.startsWith('theme') || SITUATIONS.includes(cle);
    if (dAnnonce) variantes.forEach((_, i) => ids.push(`emcee/${nom}/${cle}/${i}`));
  }
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
  const nom = DIT[persona]?.[cle] ? persona : 'classique';
  // Même mémoire que pour le texte, et pour la même raison : c'est à la voix
  // que la répétition s'entend le plus.
  const index = tirerUneVariante(`clip:${nom}:${cle}`, variantesDicibles(nom, cle, liste));
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
 * Le tirage d'une variante : un sac qu'on vide, pas un dé qu'on relance.
 *
 * Un dé, même en écartant la dernière sortie, ressert vite la même phrase :
 * douze annonces tirées parmi vingt-quatre formules en répètent au moins une
 * presque à coup sûr. Le sac, lui, épuise toutes les variantes avant d'en
 * reprendre une — et quand on le remplit, celle qui vient d'être dite ne
 * repart pas en premier.
 *
 * Un sac par clé ET par personnage : changer d'animateur en cours de soirée ne
 * doit pas hériter des tirages de l'autre. Et il se refait quand la liste des
 * candidates change — un clip qui vient d'arriver entre dans le jeu tout de
 * suite.
 */
const sacs = new Map();

function tirerUneVariante(memoire, candidates) {
  if (candidates.length <= 1) return candidates[0] ?? 0;
  const empreinte = candidates.join(',');
  let sac = sacs.get(memoire);
  if (!sac || sac.empreinte !== empreinte || !sac.reste.length) {
    const reste = [...candidates];
    for (let i = reste.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [reste[i], reste[j]] = [reste[j], reste[i]];
    }
    // On pioche par la fin : celle qui vient d'être dite part au fond du sac.
    if (reste.at(-1) === sac?.dernier) [reste[0], reste[reste.length - 1]] = [reste.at(-1), reste[0]];
    sac = { empreinte, reste, dernier: sac?.dernier };
    sacs.set(memoire, sac);
  }
  sac.dernier = sac.reste.pop();
  return sac.dernier;
}

const tous = (liste) => liste.map((_, i) => i);

/**
 * Les variantes qu'on peut réellement dire.
 *
 * Avec des enregistrements en service, seulement celles qui ont leur clip : une
 * phrase écrite mais pas encore générée laisserait le silence, et avec lui tout
 * le passage. Sans enregistrements, toutes — c'est la synthèse qui parle, et
 * elle sait tout lire.
 */
function variantesDicibles(nom, cle, liste) {
  if (!audio.enService()) return tous(liste);
  const enregistrees = tous(liste).filter((i) => audio.existe(`emcee/${nom}/${cle}/${i}`));
  return enregistrees.length ? enregistrees : tous(liste);
}

/**
 * Une réplique. On tire au sort dans la liste du personnage, avec un repli sur
 * le ton classique : une personnalité incomplète doit rester jouable plutôt que
 * de rendre l'animateur muet au milieu d'une manche.
 */
export function repliqueDe(persona, cle, vars = {}) {
  const liste = BANQUE[persona]?.[cle] ?? BANQUE.classique[cle];
  if (!liste?.length) return '';
  return remplir(liste[tirerUneVariante(`texte:${persona}:${cle}`, tous(liste))], vars);
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
    // Ne jamais conclure « pas de clips » avant la fin du chargement. En solo la
    // partie démarre au premier tap, sans salon ni attente : la toute première
    // phrase de la soirée arrivait avant la réponse du manifeste, partait à la
    // synthèse, et donnait le ton pour la suite.
    // `charger` mémorise sa promesse : après le premier appel, ceci ne coûte rien.
    await audio.charger();
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
  /** Pourquoi la voix enregistrée ne sort pas, quand c'est le cas. */
  get etatDesClips() {
    return audio.etat();
  },
  /** L'identifiant de la banque ouverte : c'est dans cette voix qu'on
   *  télécharge les packs. */
  get banqueCourante() {
    return audio.banquesDisponibles().find((b) => b.courante)?.id ?? null;
  },
  /** Les voix enregistrées installées, pour le sélecteur des réglages. */
  get banques() {
    return audio.banquesDisponibles();
  },
  /** En changer. Rend une promesse : la nouvelle banque doit être lue avant. */
  choisirBanque(id) {
    return audio.choisirBanque(id);
  },

  /**
   * Faire entendre la voix retenue, depuis les réglages.
   *
   * Volontairement hors de `enoncer` : celui-ci se tait quand la voix de
   * l'animateur est coupée sur cet appareil, ce qui est juste en partie et
   * absurde sous un bouton « écouter ». Et volontairement un CLIP et non la
   * synthèse : un bouton d'essai qui ferait entendre autre chose que ce qu'on
   * vient de choisir ne servirait à rien.
   */
  async essayer() {
    speech.stop();
    await audio.charger();
    const dit = paroleDe('classique', 'ouverture');
    if (dit && await audio.jouer([dit.id])) return;
    this.dire(dit?.texte ?? 'Bonsoir. C’est moi qui animerai cette soirée.', { force: true });
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
