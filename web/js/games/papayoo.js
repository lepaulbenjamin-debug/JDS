// Définition du jeu Papayoo.
//
// 60 cartes : 4 couleurs classiques (cœur, pique, trèfle, carreau) de 1 à 10,
// plus 20 "Payoos" numérotés de 1 à 20.
// A chaque manche, un dé désigne une couleur : le 7 de cette couleur devient
// le "Papayoo" et vaut 40 points de pénalité.
// Chaque Payoo vaut sa valeur faciale, toutes les autres cartes valent 0.
// Total distribué par manche : 1+2+...+20 = 210, plus 40 = 250 points.

const PAYOOS = Array.from({ length: 20 }, (_, i) => i + 1);

export const SUITS = [
  { id: 'cœur', label: 'Cœur', symbol: '♥', red: true },
  { id: 'carreau', label: 'Carreau', symbol: '♦', red: true },
  { id: 'pique', label: 'Pique', symbol: '♠', red: false },
  { id: 'trèfle', label: 'Trèfle', symbol: '♣', red: false },
];

/** Jetons attribuables en mode « cartes » : les 20 Payoos + le Papayoo. */
export const TOKENS = [
  ...PAYOOS.map((v) => ({ id: `payoo-${v}`, value: v, label: String(v), kind: 'payoo' })),
  { id: 'papayoo', value: 40, label: '40', kind: 'papayoo' },
];

export default {
  id: 'papayoo',
  name: 'Papayoo',
  tagline: 'Le moins de points possible',
  /** Vignette du jeu : dessin original, voir `art` dans le README. */
  art: {
    teinte: '#f5c518',
    // Une carte jaune : le Payoo, seule chose qui compte au Papayoo.
    svg: `<rect x="7" y="5" width="13" height="19" rx="2" opacity=".4"/>
          <rect x="12" y="8" width="14" height="20" rx="2"/>
          <text x="19" y="22" text-anchor="middle" font-size="11" font-weight="700"
                font-family="system-ui, sans-serif" fill="#12141c">20</text>`,
  },
  minPlayers: 3,
  maxPlayers: 8,
  lowestWins: true,
  roundTotal: 250,
  defaultTarget: 250,
  targetChoices: [150, 200, 250, 300, 500],
  // Le livret Gigamic ne connaît qu'une façon de finir : « Les joueurs fixent
  // en début de partie le nombre de manches qu'ils souhaitent jouer (4 manches
  // durent environ 30 minutes). » C'est donc elle qui est proposée d'abord.
  // S'arrêter à un score est un usage de table, très répandu mais absent du
  // livret : l'appli le propose, et le dit.
  endModes: [
    {
      id: 'rounds',
      label: 'En manches',
      hint: 'La partie dure :',
      choices: [3, 4, 5, 8, 10],
      defaut: 4,
    },
    {
      id: 'score',
      label: 'Au score',
      hint: "La partie s'arrête dès qu'un joueur atteint :",
      choices: [150, 200, 250, 300, 500],
      defaut: 250,
      note: 'Le livret fait fixer un nombre de manches ; s’arrêter à un score est un usage de table.',
    },
  ],
  allowsNegative: false,
  // Le mode « cartes » (attribution des Payoos ramassés) est disponible.
  supportsTokens: true,
  tokens: TOKENS,
  // Raccourcis proposés à côté de chaque score en saisie manuelle.
  quickAdd: [{ label: '+40', value: 40, title: 'Ajouter le Papayoo (40 points)' }],

  /** Contexte donné à l'IA pour lire une photo. */
  vision: {
    context: `Règles du Papayoo utiles à la lecture :
- Les Payoos sont 20 cartes jaunes numérotées de 1 à 20 ; chacune vaut sa valeur en points.
- Le Papayoo est le 7 de la couleur désignée au dé ; il vaut 40 points.
- Toutes les autres cartes valent 0 point.
- Le total distribué sur une manche complète est de 250 points.`,
    cards: {
      label: 'Les cartes d\u2019un joueur',
      hint: "Étalez les cartes ramassées par {joueur} et photographiez-les : l'appli additionne les Payoos et le Papayoo.",
      instruction: `La photo montre les cartes ramassées par UN joueur sur une manche de Papayoo.
Liste la valeur en points de chaque carte qui compte : chaque Payoo vaut son numéro, et le Papayoo compte pour 40.
Ne liste pas les cartes des couleurs classiques : elles valent 0.
Un même numéro de Payoo ne peut apparaître qu'une fois.`,
    },
  },

  /** Nombre de cartes par joueur, cartes retirées et taille de l'écart. */
  deal(playerCount) {
    // À 7 et 8 joueurs on retire les 1 des quatre couleurs classiques.
    const removed = playerCount >= 7 ? 4 : 0;
    const pass = playerCount <= 4 ? 5 : playerCount === 5 ? 4 : 3;
    return { removed, pass, perPlayer: (60 - removed) / playerCount };
  },

  /**
   * Vérifie la cohérence d'une manche.
   * @returns {{ok: boolean, level: 'ok'|'warn', total: number, diff: number, message: string}}
   */
  validateRound(scores, players) {
    const values = players.map((p) => Number(scores[p.id] ?? 0));
    const total = values.reduce((a, b) => a + b, 0);
    const diff = total - this.roundTotal;
    const missing = players.filter((p) => scores[p.id] === '' || scores[p.id] == null);

    if (values.some((v) => Number.isNaN(v))) {
      return { ok: false, level: 'warn', total, diff, message: 'Certains scores ne sont pas des nombres.' };
    }
    if (values.some((v) => v < 0)) {
      return { ok: false, level: 'warn', total, diff, message: 'Les scores ne peuvent pas être négatifs.' };
    }
    if (diff === 0 && missing.length === 0) {
      return { ok: true, level: 'ok', total, diff, message: `Total ${total} / ${this.roundTotal} — c'est bon.` };
    }
    if (diff < 0) {
      return {
        ok: false,
        level: 'warn',
        total,
        diff,
        message: `Il reste ${-diff} point${-diff > 1 ? 's' : ''} à répartir (${total} / ${this.roundTotal}).`,
      };
    }
    return {
      ok: false,
      level: 'warn',
      total,
      diff,
      message: `${diff} point${diff > 1 ? 's' : ''} de trop (${total} / ${this.roundTotal}).`,
    };
  },

  /** Présentation en deux phrases, à lire à la table avant de commencer. */
  pitch: "Papayoo, c'est un jeu de plis où on cherche à ne surtout rien gagner. On joue à la couleur demandée, et celui qui remporte le pli ramasse les cartes — donc les points. Seules les cartes jaunes, les Payoos, coûtent quelque chose, plus une carte piégée qui en vaut quarante à elle seule. À la fin, le plus petit total gagne.",

  /**
   * Script de mise en place, écrit pour être lu à voix haute.
   * Chaque étape reste courte : c'est ce qu'on dit en préparant la table.
   */
  setup(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);
    const { perPlayer, removed, pass } = this.deal(n);

    return [
      {
        title: 'Le matériel',
        say: "Papayoo se joue avec soixante cartes et un dé. Quarante cartes classiques, de 1 à 10 dans les quatre couleurs habituelles, et vingt cartes jaunes numérotées de 1 à 20 : ce sont les Payoos.",
      },
      {
        title: 'Préparer le paquet',
        say: removed
          ? `À ${n} joueurs, on retire d'abord les quatre 1 des couleurs classiques : le 1 de pique, de cœur, de carreau et de trèfle. On garde tous les Payoos.`
          : `À ${n} joueurs, on joue avec les soixante cartes : on ne retire rien.`,
      },
      {
        title: 'Distribuer',
        say: `Mélangez, puis distribuez toutes les cartes une par une. Chacun reçoit ${perPlayer} cartes, et il ne doit rien rester au milieu.`,
      },
      {
        title: "L'écart",
        say: `Regardez votre main et choisissez ${pass} cartes dont vous voulez vous débarrasser. Vous les passez face cachée à votre voisin de gauche. On ne regarde les cartes reçues de son voisin de droite qu'une fois les siennes données.`,
      },
      {
        title: 'Désigner le Papayoo',
        say: "Quand tout le monde a fait son écart, le donneur lance le dé : il désigne une couleur. Le 7 de cette couleur devient le Papayoo, et il vaut à lui seul quarante points de pénalité. Posez-le au milieu de la table pour que personne ne l'oublie.",
      },
      {
        title: 'Ce qui coûte des points',
        say: `Seules deux choses comptent : chaque Payoo vaut sa valeur, de 1 à 20, et le Papayoo vaut quarante. Toutes les autres cartes valent zéro. Ça fait ${this.roundTotal} points à se répartir sur la manche, et l'appli vérifiera le compte.`,
      },
      {
        title: 'Jouer les plis',
        say: "Le donneur entame avec la carte de son choix. Chacun doit fournir la couleur demandée s'il en a une, sinon il se défausse de ce qu'il veut. Attention : les Payoos sont une couleur comme une autre. Celui qui a posé la plus forte carte de la couleur demandée remporte le pli, ramasse les cartes, et entame le pli suivant.",
      },
      {
        title: 'Compter et enchaîner',
        say: "Quand toutes les cartes sont jouées, chacun compte les points des Payoos qu'il a ramassés. Vous les saisissez ici, et on redistribue pour une nouvelle manche. La partie s'arrête dès qu'un joueur atteint le score cible : le plus petit total gagne.",
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: "Ramasser le moins de points possible. La partie s'arrête dès qu'un joueur atteint le score cible ; c'est le joueur avec le plus petit total qui gagne.",
    },
    {
      title: 'Les cartes',
      body: '60 cartes : les 4 couleurs classiques de 1 à 10 (0 point), et 20 Payoos numérotés de 1 à 20. Chaque Payoo vaut sa valeur en points de pénalité.',
    },
    {
      title: 'Le Papayoo',
      body: "Avant chaque manche, un dé désigne une couleur. Le 7 de cette couleur devient le Papayoo et vaut 40 points de pénalité.",
    },
    {
      title: 'Total par manche',
      body: '210 points de Payoos + 40 points de Papayoo = 250 points répartis à chaque manche. L\'appli le vérifie pour vous.',
    },
    {
      title: 'Distribution et écart',
      body: "3 joueurs : 20 cartes chacun, écart de 5. 4 : 15 cartes, écart de 5. 5 : 12 cartes, écart de 4. 6 : 10 cartes, écart de 3. 7 et 8 joueurs : on retire les quatre 1 des couleurs classiques (8 puis 7 cartes chacun), écart de 3. L'écart se passe toujours au voisin de gauche.",
    },
    {
      title: 'Les plis',
      body: "Le donneur entame. On doit fournir la couleur demandée si on en a une, sinon on se défausse librement — il n'y a pas d'atout. La plus forte carte de la couleur demandée remporte le pli et entame le suivant.",
    },
  ],
};
