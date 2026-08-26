// Définition du jeu « 6 qui prend ! ».
//
// 104 cartes numérotées de 1 à 104, chacune valant de 1 à 7 têtes de bœuf.
// Chaque manche, tout le monde pose ses 10 cartes ; celui qui pose la 6e carte
// d'une rangée ramasse les cinq précédentes — et leurs têtes de bœuf.
// Il n'y a pas de total de manche fixe : les cartes non ramassées ne comptent pas.

/**
 * Nombre de têtes de bœuf d'une carte.
 * Une seule règle s'applique, la plus généreuse : le 55 vaut 7, les doublets 5,
 * les dizaines 3, les autres multiples de 5 valent 2, le reste 1.
 */
export function bullHeads(card) {
  if (card === 55) return 7;
  if (card % 11 === 0) return 5;
  if (card % 10 === 0) return 3;
  if (card % 5 === 0) return 2;
  return 1;
}

/** Toutes les têtes de bœuf du paquet : borne haute absolue d'un score. */
const DECK_HEADS = 171;

export default {
  id: 'six-qui-prend',
  name: '6 qui prend !',
  tagline: 'Éviter les têtes de bœuf',
  /** Vignette du jeu : dessin original, voir `art` dans le README. */
  art: {
    teinte: '#f87171',
    // Une tête de bœuf : cornes larges et museau carré, pour ne pas la
    // confondre avec un animal de peluche.
    svg: `<path d="M15.5 12C13 8.5 8 7 4 8.5c1 1 1.5 2 1.5 3.2 0 1.4-.8 2.4-2 3 2.5 1.6 6.5 1.6 9-.2M16.5 12c2.5-3.5 7.5-5 11.5-3.5-1 1-1.5 2-1.5 3.2 0 1.4.8 2.4 2 3-2.5 1.6-6.5 1.6-9-.2"
                stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
          <path d="M10 12h12l-1 8.5c-.3 2.6-2.4 4.5-5 4.5s-4.7-1.9-5-4.5z"/>
          <circle cx="13.2" cy="16.5" r="1.4" fill="#12141c"/><circle cx="18.8" cy="16.5" r="1.4" fill="#12141c"/>
          <rect x="12.6" y="20.5" width="6.8" height="3.6" rx="1.8" fill="#12141c" opacity=".6"/>`,
  },
  minPlayers: 2,
  maxPlayers: 10,
  lowestWins: true,
  roundTotal: null,          // les cartes non ramassées ne comptent pour personne
  allowsNegative: false,
  supportsTokens: false,
  defaultTarget: 66,
  targetChoices: [66, 100, 150],
  // Le livret prévoit les deux : « On joue plusieurs manches jusqu'à ce que
  // l'un des joueurs ait réuni en tout plus de 66 têtes de bœuf. […] Avant le
  // début du jeu, il est bien sûr possible de convenir d'un autre total de
  // points ou d'un nombre de manches maximum. »
  endModes: [
    {
      id: 'score',
      label: 'Au score',
      hint: "La partie s'arrête dès qu'un joueur atteint :",
      choices: [66, 100, 150],
      defaut: 66,
    },
    {
      id: 'rounds',
      label: 'En manches',
      hint: 'La partie dure :',
      choices: [3, 5, 8, 10],
      defaut: 5,
    },
  ],

  // Les cinq valeurs possibles d'une carte : on compte les tas en tapotant.
  quickAdd: [
    { label: '+1', value: 1, title: 'Une carte ordinaire' },
    { label: '+2', value: 2, title: 'Carte se terminant par 5' },
    { label: '+3', value: 3, title: 'Carte se terminant par 0' },
    { label: '+5', value: 5, title: 'Doublet : 11, 22, 33…' },
    { label: '+7', value: 7, title: 'La carte 55' },
  ],

  deal() {
    return { perPlayer: 10, removed: 0, rows: 4 };
  },

  validateRound(scores, players) {
    const missing = players.filter((p) => scores[p.id] === '' || scores[p.id] == null);
    const values = players.map((p) => Number(scores[p.id]));

    if (values.some((v) => Number.isNaN(v))) {
      return { ok: false, level: 'warn', message: 'Certains scores ne sont pas des nombres.' };
    }
    if (values.some((v) => v < 0)) {
      return { ok: false, level: 'warn', message: 'On ne peut pas ramasser un nombre négatif de têtes de bœuf.' };
    }
    if (missing.length) {
      return {
        ok: false,
        level: 'warn',
        message: `Il manque le score de ${missing.map((p) => p.name).join(', ')} (mettez 0 s'il n'a rien ramassé).`,
      };
    }
    const total = values.reduce((a, b) => a + b, 0);
    if (total > DECK_HEADS) {
      return {
        ok: false,
        level: 'warn',
        message: `${total} têtes de bœuf ramassées, alors que le paquet n'en contient que ${DECK_HEADS}.`,
      };
    }
    return {
      ok: true,
      level: 'ok',
      message: `${total} tête${total > 1 ? 's' : ''} de bœuf ramassée${total > 1 ? 's' : ''} sur cette manche.`,
    };
  },

  vision: {
    context: `Règles du 6 qui prend ! utiles à la lecture :
- Les cartes sont numérotées de 1 à 104 ; c'est le grand numéro imprimé sur la carte.
- Le nombre de têtes de bœuf est aussi dessiné sur la carte, mais c'est le NUMÉRO qui est demandé ici.`,
    cards: {
      label: 'Les cartes d\u2019un joueur',
      hint: "Étalez le tas de {joueur} de façon à voir tous les numéros : l'appli lit les cartes et applique le barème des têtes de bœuf.",
      instruction: `La photo montre les cartes ramassées par UN joueur sur une manche de 6 qui prend.
Liste le NUMÉRO de chaque carte visible (un entier de 1 à 104), une entrée par carte.
Ne calcule pas les têtes de bœuf : l'application s'en charge à partir des numéros.
Si des cartes se chevauchent et qu'un numéro est masqué, signale-le dans "notes".`,
      // Le modèle lit les numéros, l'appli applique le barème : plus fiable que
      // de lui demander de connaître la valeur de chaque carte.
      mapValue: bullHeads,
      mapLabel: (card) => `${card} → ${bullHeads(card)}`,
    },
  },

  pitch: "6 qui prend, c'est cent quatre cartes, quatre rangées au milieu de la table, et une seule chose à éviter : ramasser. Tout le monde choisit une carte en même temps, on les révèle, et elles se rangent de la plus petite à la plus grande. Celui qui pose la sixième carte d'une rangée ramasse les cinq autres, avec les têtes de bœuf qu'elles portent. Le plus petit total gagne.",

  setup(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);
    return [
      {
        title: 'Le matériel',
        say: 'Le jeu contient cent quatre cartes, numérotées de 1 à 104. Chacune porte aussi des têtes de bœuf : ce sont les points de pénalité, et il y en a de une à sept selon la carte.',
      },
      {
        title: 'Distribuer',
        say: `Mélangez, puis donnez dix cartes à chacun des ${n} joueurs. Regardez votre main, mais gardez-la pour vous.`,
      },
      {
        title: 'Ouvrir les quatre rangées',
        say: 'Retournez ensuite quatre cartes au milieu de la table, les unes sous les autres : chacune ouvre une rangée. Une rangée ne pourra jamais dépasser cinq cartes.',
      },
      {
        title: 'Choisir en même temps',
        say: 'À chaque tour, tout le monde choisit une carte de sa main et la pose face cachée devant soi. Quand tout le monde a choisi, on les retourne toutes ensemble.',
      },
      {
        title: 'Poser dans l’ordre',
        say: "On place les cartes une par une, de la plus petite à la plus grande. Chaque carte va au bout de la rangée dont la dernière carte est la plus proche en dessous d'elle. Une carte se pose donc toujours après une carte plus petite.",
      },
      {
        title: 'La sixième carte',
        say: "Voilà tout le sel du jeu : si votre carte est la sixième d'une rangée, vous ne la posez pas au bout — vous ramassez les cinq cartes déjà là, elles comptent contre vous, et votre carte devient la première d'une nouvelle rangée.",
      },
      {
        title: 'La carte trop petite',
        say: "Si votre carte est plus petite que la dernière carte de toutes les rangées, vous ne pouvez la poser nulle part : vous choisissez une rangée, vous la ramassez entièrement, et votre carte la remplace.",
      },
      {
        title: 'Compter les têtes',
        say: 'Quand les dix cartes sont jouées, chacun compte les têtes de bœuf de son tas. Une carte ordinaire en vaut une ; celles qui se terminent par 5 en valent deux ; les dizaines, trois ; les doublets comme 11, 22 ou 33, cinq ; et le 55, à lui seul, sept.',
      },
      {
        title: 'Enchaîner',
        say: "Notez les scores ici, remélangez tout et redistribuez. La partie s'arrête à la fin de la manche où un joueur atteint le score cible, et c'est le plus petit total qui gagne.",
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: "Ramasser le moins de têtes de bœuf possible. La partie s'arrête à la fin de la manche où un joueur atteint le score cible (66 dans la règle officielle) ; le plus petit total gagne.",
    },
    {
      title: 'Les têtes de bœuf',
      body: '1 par carte ordinaire ; 2 pour les cartes se terminant par 5 ; 3 pour les dizaines ; 5 pour les doublets (11, 22, 33…) ; 7 pour le 55. Le paquet complet en contient 171.',
    },
    {
      title: 'Mise en place',
      body: '10 cartes par joueur, puis 4 cartes retournées au centre pour ouvrir 4 rangées de 5 places maximum. On joue avec les 104 cartes quel que soit le nombre de joueurs.',
    },
    {
      title: 'Poser une carte',
      body: "Choix simultané, révélation, puis résolution de la plus petite carte à la plus grande. Une carte se pose au bout de la rangée dont la dernière carte est la plus proche en dessous d'elle.",
    },
    {
      title: 'Ramasser',
      body: "Poser la 6e carte d'une rangée : on ramasse les 5 cartes et la sienne ouvre la rangée. Carte plus petite que toutes les fins de rangées : on choisit une rangée, on la ramasse, et la carte la remplace.",
    },
    {
      title: 'Variante professionnelle',
      body: "Pour des parties plus tendues, ne gardez que les cartes de 1 à 10 fois le nombre de joueurs, plus 4 : tout le monde sait alors quelles cartes sont en jeu.",
    },
  ],
};
