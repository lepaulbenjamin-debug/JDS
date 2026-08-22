// Définition du jeu Skyjo.
//
// 150 cartes numérotées de -2 à 12. Chaque joueur a une grille de 12 cartes
// (3 lignes de 4) et cherche à faire le plus petit total.
// Particularités par rapport à un jeu de plis :
//  - pas de total fixe par manche : chacun compte sa propre grille ;
//  - les scores peuvent être négatifs ;
//  - le joueur qui termine la manche voit son score doublé s'il n'a pas
//    strictement le plus petit score de la manche (et seulement s'il est positif).

/** Bornes plausibles d'un score de manche : 12 cartes de -2 à 12. */
const MIN_SCORE = -24;
const MAX_SCORE = 144;

export default {
  id: 'skyjo',
  name: 'Skyjo',
  tagline: 'Le plus petit total gagne',
  minPlayers: 2,
  maxPlayers: 8,
  lowestWins: true,
  roundTotal: null,          // chacun compte sa grille : aucun total à vérifier
  allowsNegative: true,
  supportsTokens: false,
  defaultTarget: 100,
  targetChoices: [100, 150, 200],

  /** Informations demandées avant de valider une manche. */
  extras: [
    {
      key: 'ender',
      type: 'player',
      label: 'Qui a terminé la manche ?',
      hint: "Le premier joueur à avoir retourné ses douze cartes. Son score double s'il n'a pas le plus petit total.",
    },
  ],

  deal() {
    return { perPlayer: 12, removed: 0 };
  },

  /**
   * Applique la règle du doublement. Renvoie les scores à enregistrer et
   * ce qu'il faut expliquer à la table.
   */
  finalize(raw, extras, players) {
    const scores = Object.fromEntries(players.map((p) => [p.id, Number(raw[p.id]) || 0]));
    const enderId = extras?.ender;
    const ender = players.find((p) => p.id === enderId);
    if (!ender) return { scores, notes: [] };

    const own = scores[ender.id];
    const lowest = Math.min(...players.map((p) => scores[p.id]));
    const aloneLowest = own === lowest && players.filter((p) => scores[p.id] === lowest).length === 1;

    if (own <= 0) {
      return { scores, notes: [`${ender.name} termine avec ${own} : un score nul ou négatif n'est jamais doublé.`] };
    }
    if (aloneLowest) {
      return { scores, notes: [`${ender.name} termine avec le plus petit score : pas de pénalité.`] };
    }
    scores[ender.id] = own * 2;
    return {
      scores,
      notes: [`${ender.name} termine sans avoir le plus petit score : ${own} doublé à ${own * 2}.`],
    };
  },

  /**
   * Vérifie la cohérence d'une manche.
   * @returns {{ok: boolean, level: 'ok'|'warn', message: string}}
   */
  validateRound(scores, players, extras) {
    const missing = players.filter((p) => scores[p.id] === '' || scores[p.id] == null);
    const values = players.map((p) => Number(scores[p.id]));

    if (values.some((v) => Number.isNaN(v))) {
      return { ok: false, level: 'warn', message: 'Certains scores ne sont pas des nombres.' };
    }
    if (missing.length) {
      const names = missing.map((p) => p.name).join(', ');
      return { ok: false, level: 'warn', message: `Il manque le score de ${names}.` };
    }
    const outOfRange = players.filter((p) => {
      const v = Number(scores[p.id]);
      return v < MIN_SCORE || v > MAX_SCORE;
    });
    if (outOfRange.length) {
      return {
        ok: false,
        level: 'warn',
        message: `Score improbable pour ${outOfRange.map((p) => p.name).join(', ')} : une grille va de ${MIN_SCORE} à ${MAX_SCORE}.`,
      };
    }
    if (!extras?.ender || !players.some((p) => p.id === extras.ender)) {
      return { ok: false, level: 'warn', message: 'Indiquez qui a terminé la manche : sa pénalité en dépend.' };
    }
    return { ok: true, level: 'ok', message: 'Manche complète.' };
  },

  /** Contexte donné à l'IA pour lire une photo. */
  vision: {
    context: `Règles du Skyjo utiles à la lecture :
- Chaque joueur a une grille de 12 cartes, disposée en 3 lignes de 4 colonnes.
- Les cartes vont de -2 à 12 ; le score du joueur est la somme des cartes de sa grille.
- Une colonne dont les trois cartes étaient identiques est retirée du jeu : il manque alors des cartes dans la grille, et ces emplacements ne comptent pas.`,
    cards: {
      label: 'Grille de fin de manche',
      hint: "Photographiez la grille d'un joueur à la fin de la manche, cartes retournées.",
      instruction: `La photo montre la grille de fin de manche d'UN joueur au Skyjo.
Liste la valeur de chaque carte visible de la grille, une entrée par carte (les valeurs vont de -2 à 12, et une même valeur peut revenir plusieurs fois).
Ne compte pas les emplacements vides : ce sont des colonnes retirées, elles ne rapportent rien.
Attention au signe : -2 et -1 sont des scores négatifs.
Une grille complète compte 12 cartes ; si tu en vois moins, dis-le dans "notes".`,
    },
  },

  pitch: "Skyjo, c'est douze cartes posées devant vous, face cachée, et un seul objectif : que leur total soit le plus petit possible. À chaque tour on échange une carte contre une meilleure, ou on tente sa chance en en retournant une. Dès que quelqu'un a tout retourné, la manche s'arrête net — et on additionne. On joue jusqu'à ce qu'un joueur dépasse cent points ; le plus petit total gagne.",

  setup(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);
    return [
      {
        title: 'Le matériel',
        say: 'Skyjo se joue avec un paquet de 150 cartes numérotées de moins deux à douze. Il vous faut aussi de quoi noter, mais ça, cette application le fait.',
      },
      {
        title: 'Distribuer les grilles',
        say: `Mélangez, puis donnez douze cartes face cachée à chacun des ${n} joueurs. Chacun les dispose devant lui en trois lignes de quatre colonnes, sans les regarder.`,
      },
      {
        title: 'La pioche et la défausse',
        say: "Posez le reste du paquet au milieu de la table, face cachée : c'est la pioche. Retournez la première carte à côté pour commencer la défausse.",
      },
      {
        title: 'Retourner deux cartes',
        say: 'Chacun retourne maintenant deux cartes de son choix dans sa grille, et les laisse visibles. Celui dont la somme de ces deux cartes est la plus élevée commence la manche.',
      },
      {
        title: 'À votre tour',
        say: "À votre tour, deux options. Soit vous prenez la carte visible de la défausse, et vous l'échangez obligatoirement contre une carte de votre grille, face visible ou face cachée. Soit vous piochez : vous pouvez alors soit l'échanger de la même façon, soit la jeter à la défausse et retourner une de vos cartes cachées.",
      },
      {
        title: 'Les colonnes identiques',
        say: 'Si une de vos colonnes montre trois cartes identiques et visibles, retirez ces trois cartes du jeu : elles partent à la défausse et ne comptent plus rien pour vous.',
      },
      {
        title: 'La fin de la manche',
        say: "Dès qu'un joueur a retourné sa douzième carte, la manche se termine : chacun des autres joue encore un dernier tour, puis tout le monde retourne ce qui reste de caché.",
      },
      {
        title: 'Compter les points',
        say: "Chacun additionne les cartes de sa grille. Attention au piège : celui qui a fermé la manche voit son score doublé s'il n'a pas le plus petit total, à lui tout seul. L'application le calcule pour vous, dites-lui simplement qui a terminé.",
      },
      {
        title: 'Enchaîner',
        say: 'On redistribue et on recommence. La partie s\'arrête à la fin de la manche où un joueur atteint le score cible, et le plus petit total remporte la partie.',
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: "Avoir le plus petit total de points. La partie s'arrête à la fin de la manche où un joueur atteint le score cible (100 points dans la règle officielle).",
    },
    {
      title: 'Les cartes',
      body: '150 cartes de -2 à 12. Chaque joueur en reçoit 12, disposées en 3 lignes de 4 colonnes, face cachée ; il en retourne 2 avant de commencer. Le score de la manche est la somme des cartes de sa grille.',
    },
    {
      title: 'Le tour',
      body: "Prendre la carte de la défausse et l'échanger contre une carte de sa grille ; ou piocher, puis l'échanger, ou la défausser et retourner une carte cachée à la place.",
    },
    {
      title: 'Colonnes identiques',
      body: 'Trois cartes identiques et visibles dans une même colonne sont retirées du jeu et défaussées : elles ne rapportent plus aucun point.',
    },
    {
      title: 'Fin de manche et doublement',
      body: "La manche s'arrête quand un joueur a retourné ses 12 cartes ; les autres finissent le tour. Si ce joueur n'a pas strictement le plus petit score de la manche, son score est doublé — mais seulement s'il est positif. Un score nul ou négatif n'est jamais doublé.",
    },
  ],
};
