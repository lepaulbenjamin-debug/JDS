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
  minPlayers: 3,
  maxPlayers: 8,
  lowestWins: true,
  roundTotal: 250,
  defaultTarget: 250,
  targetChoices: [150, 200, 250, 300, 500],
  // Le mode « cartes » (attribution des Payoos ramassés) est disponible.
  supportsTokens: true,
  tokens: TOKENS,

  /** Nombre de cartes par joueur + cartes retirées, selon l'effectif. */
  deal(playerCount) {
    if (playerCount >= 7) {
      const removed = 4; // on retire 4 cartes basses des couleurs classiques
      return { removed, perPlayer: (60 - removed) / playerCount };
    }
    return { removed: 0, perPlayer: 60 / playerCount };
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

  /** Texte affiché dans l'écran de règles. */
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
      title: 'Distribution',
      body: "3 joueurs : 20 cartes chacun. 4 : 15. 5 : 12. 6 : 10. À 7 ou 8 joueurs, on retire 4 cartes basses des couleurs classiques (8 ou 7 cartes chacun).",
    },
  ],
};
