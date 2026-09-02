// Définition du jeu « Forêt Mixte » (Kosch, Lookout Games).
//
// Le décompte final est le point douloureux du jeu, et pour une raison
// structurelle : chaque carte marque selon sa propre condition. Le Lièvre
// d'Europe rapporte autant de points qu'il y a de lièvres, la Barbastelle n'en
// rapporte que s'il y a trois espèces de chauves-souris différentes, l'Érable
// compte les arbres de la forêt entière. Personne ne retient tout ça : on
// consulte les cartes de référence carte après carte, et on additionne une
// longue colonne de nombres à la main.
//
// Ce que l'appli peut faire honnêtement, c'est exactement ce que fait le bloc
// de score de l'éditeur : quatre lignes par joueur, la Grotte convertie en
// points, et l'addition. Elle ne sait pas ce que vaut telle carte dans telle
// forêt — cela dépend de la carte ET de la disposition — et ne prétend pas le
// savoir : l'évaluation reste à la table, l'arithmétique revient à l'appli.
//
// Vérifié sur le livret français officiel (ammd.ch/pdfregles/foretmixte.pdf) et
// sur le bloc de score publié par Lookout, dont les quatre lignes sont reprises
// telles quelles. L'exemple de décompte du livret — 85 points — sert de test.

import { lireLigne, grillesVides } from './common.js';

/** Ce que rapporte chaque carte rangée sous la Grotte. */
const POINTS_PAR_CARTE_GROTTE = 1;

/** Cartes à retirer de la boîte avant de jouer, selon l'effectif. */
export const CARTES_RETIREES = { 2: 30, 3: 20, 4: 10, 5: 0 };

/**
 * Décompte d'un joueur, dans les quatre catégories du bloc de score officiel.
 * Les trois premières sont des points déjà évalués carte par carte ; la
 * quatrième est un nombre de cartes, que l'appli convertit.
 */
export function decompteForet(form, playerId) {
  const d = lireLigne(form, 'decompte', playerId);
  const arbres = d('arbres');
  const hautBas = d('hautBas');
  const gaucheDroite = d('gaucheDroite');
  const cartesGrotte = d('grotte');
  const grotte = cartesGrotte * POINTS_PAR_CARTE_GROTTE;

  return {
    arbres,
    hautBas,
    gaucheDroite,
    cartesGrotte,
    grotte,
    total: arbres + hautBas + gaucheDroite + grotte,
  };
}

export default {
  id: 'foret-mixte',
  name: 'Forêt Mixte',
  tagline: 'Le décompte final, mis en ordre',
  /** Vignette du jeu : dessin original, voir `art` dans le README. */
  art: {
    teinte: '#34d399',
    // Un conifère et un feuillu côte à côte : c'est ce que veut dire « forêt
    // mixte », et ça distingue la vignette de tout autre jeu d'arbres.
    svg: `<path d="M9 4l5 9h-3l4 7H4l4-7H5z"/>
          <rect x="8" y="20" width="2" height="7" rx=".6" opacity=".8"/>
          <circle cx="23" cy="12" r="6.5" opacity=".85"/>
          <circle cx="19" cy="16" r="4.5" opacity=".6"/>
          <circle cx="27" cy="16" r="4.5" opacity=".6"/>
          <rect x="22" y="19" width="2" height="8" rx=".6" opacity=".8"/>
          <rect x="3" y="27.5" width="26" height="2" rx="1" opacity=".45"/>`,
  },
  minPlayers: 2,
  maxPlayers: 5,
  lowestWins: false,
  roundTotal: null,
  allowsNegative: false,
  supportsTokens: false,
  entry: 'form',
  // Comme au 7 Wonders : une « manche » est une partie entière, le score se
  // compte une seule fois, à la fin.
  roundLabel: 'Partie',
  endMode: 'rounds',
  defaultTarget: 1,
  targetChoices: [1, 2, 3],

  // « Le joueur ayant obtenu le meilleur score remporte la partie. En cas
  // d'égalité, les joueurs concernés se partagent la victoire. » Le livret ne
  // prévoit donc aucun départage : il n'y en aura pas.
  tieNote: 'Le livret le dit : à égalité, les joueurs concernés se partagent la victoire.',

  deal(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, 2), 5);
    return { perPlayer: 6, retirees: CARTES_RETIREES[n] ?? 0, mainMax: 10 };
  },

  form() {
    return [
      {
        key: 'decompte',
        type: 'players',
        label: 'Le décompte',
        hint: 'Les quatre lignes du bloc de score de l’éditeur. Additionnez les points de vos cartes visibles catégorie par catégorie ; pour la Grotte, comptez les cartes, l’appli fait la conversion.',
        columns: [
          { key: 'arbres', label: 'Arbres', min: 0, max: 300, placeholder: '0' },
          { key: 'hautBas', label: 'Haut/Bas', min: 0, max: 300, placeholder: '0' },
          { key: 'gaucheDroite', label: 'Gauche/Droite', min: 0, max: 300, placeholder: '0' },
          { key: 'grotte', label: 'Grotte (cartes)', min: 0, max: 60, placeholder: '0' },
        ],
      },
    ];
  },

  validateRound(form, players) {
    const manquants = players.filter((p) => grillesVides(form, ['decompte'], p.id));
    if (manquants.length === players.length) {
      return { ok: false, level: 'warn', message: 'Saisissez le décompte de chaque joueur.' };
    }

    // Aucun total imposé : le retour utile pendant la saisie, c'est le
    // classement qui se dessine, même s'il manque encore des joueurs.
    const classement = players
      .filter((p) => !manquants.includes(p))
      .map((p) => ({ nom: p.name, total: decompteForet(form, p.id).total }))
      .sort((x, y) => y.total - x.total)
      .map((c) => `${c.nom} ${c.total}`)
      .join(' · ');

    if (manquants.length) {
      return {
        ok: false,
        level: 'warn',
        message: `${classement} — il manque ${manquants.map((p) => p.name).join(', ')}.`,
      };
    }
    return { ok: true, level: 'ok', message: classement };
  },

  finalize(form, ctx, players) {
    const scores = {};
    const details = {};
    for (const p of players) {
      const d = decompteForet(form, p.id);
      scores[p.id] = d.total;
      details[p.id] = d;
    }

    const notes = [];
    const classement = [...players].sort((a, b) => scores[b.id] - scores[a.id]);
    const tete = classement[0];
    const d = details[tete.id];

    // On montre l'addition de celui qui mène : c'est la ligne qu'on veut
    // pouvoir revérifier quand quelqu'un doute du total.
    const morceaux = [
      `${d.arbres} aux arbres`,
      `${d.hautBas} en haut-bas`,
      `${d.gaucheDroite} en gauche-droite`,
    ];
    if (d.cartesGrotte > 0) {
      morceaux.push(`${d.cartesGrotte} carte${d.cartesGrotte > 1 ? 's' : ''} de Grotte à 1 point`);
    }
    notes.push(`${tete.name} : ${morceaux.join(' + ')} = ${d.total}.`);

    const exaequo = classement.filter((p) => scores[p.id] === scores[tete.id]);
    if (exaequo.length > 1) {
      notes.push(
        `${exaequo.map((p) => p.name).join(' et ')} à ${scores[tete.id]} :`
        + ' le livret ne départage pas, la victoire est partagée.',
      );
    }

    return { scores, notes };
  },

  pitch: "Forêt Mixte, c'est une forêt qu'on plante carte après carte. À votre tour, vous piochez deux cartes, ou vous en jouez une en la payant avec d'autres cartes de votre main. Les arbres forment le squelette ; tout autour, vous glissez des animaux, des plantes et des champignons, chacun avec ses exigences : celui-ci veut ses congénères, celui-là un habitat précis. La partie s'arrête net à la troisième carte Hiver. Le décompte final est long parce que chaque carte compte à sa façon — l'appli ne le fera pas à votre place, mais elle le met en ordre et fait l'addition.",

  setup(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);
    const retirees = CARTES_RETIREES[n] ?? 0;
    return [
      {
        title: 'La clairière',
        say: 'Posez le plateau Clairière au centre de la table, à portée de tous, et les quatorze cartes de référence à côté. Elles expliquent chaque espèce : gardez-les accessibles, vous les consulterez au décompte.',
      },
      {
        title: 'Les grottes',
        say: 'Chaque joueur prend une carte Grotte et la pose devant lui. Chaque carte rangée dessous rapportera un point à la fin.',
      },
      {
        title: 'Les cartes Hiver',
        say: 'Mettez les trois cartes Hiver de côté pour l’instant. Ce sont elles qui décideront de la fin de la partie.',
      },
      {
        title: 'Retirer des cartes',
        say: retirees > 0
          ? `Mélangez toutes les autres cartes, puis rangez ${retirees} cartes dans la boîte sans les regarder. À ${n} joueurs, c’est ce qu’il faut retirer pour que la partie dure le temps prévu.`
          : `Mélangez toutes les autres cartes. À ${n} joueurs, vous jouez avec la totalité du jeu : ne retirez rien.`,
      },
      {
        title: 'Monter la pioche',
        say: 'Divisez les cartes en trois piles à peu près égales, faces cachées. Mélangez deux cartes Hiver dans l’une d’elles, puis posez la troisième carte Hiver au sommet de cette même pile. Empilez enfin les deux autres piles par-dessus, et posez le tout à côté de la Clairière.',
      },
      {
        title: 'Les mains de départ',
        say: 'Chacun pioche six cartes. Si vous n’avez aucun Arbre dans votre main, vous avez droit à une seconde chance : remettez vos six cartes dans la boîte et piochez-en six nouvelles. Une seule seconde chance par joueur.',
      },
      {
        title: 'Qui commence',
        say: 'Le dernier joueur à s’être promené en forêt commence. Ensuite on joue dans le sens des aiguilles d’une montre.',
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: "Bâtir la forêt qui rapporte le plus de points. Chaque carte marque selon sa propre condition, et c'est tout l'intérêt du jeu : il faut choisir des espèces qui se complètent. Le meilleur score gagne ; à égalité, les joueurs concernés se partagent la victoire.",
    },
    {
      title: 'Le tour de jeu',
      body: "Une seule action, au choix. Soit piocher deux cartes, chacune prise dans la pioche ou dans la Clairière. Soit jouer une carte : on paie son coût en défaussant le nombre de cartes indiqué dans la Clairière, on place la carte dans sa forêt, puis on applique son effet et son bonus s'il y en a. La main est limitée à dix cartes.",
    },
    {
      title: 'Arbres et emplacements',
      body: "Les Arbres forment le squelette de la forêt et offrent quatre emplacements, un par côté. Les autres cartes sont divisées en deux : haut et bas, ou gauche et droite. On glisse la moitié inutile sous l'Arbre, et seule la moitié qui reste visible appartient à la forêt — l'autre ne compte plus, ni pendant la partie ni au décompte. Faute d'Arbre, on peut jouer n'importe quelle carte face cachée comme pousse d'arbre : elle offre quatre emplacements mais n'appartient à aucune espèce.",
    },
    {
      title: 'La Clairière',
      body: "C'est là qu'atterrissent les cartes servant à payer. À la fin de votre tour, si la Clairière contient dix cartes ou plus, elle est vidée : toutes ces cartes retournent dans la boîte.",
    },
    {
      title: 'La fin de la partie',
      body: "Les trois cartes Hiver sont dans le tiers inférieur de la pioche. Qui en pioche une la pose à côté de la Clairière et pioche une carte de remplacement. Dès que la troisième est révélée, la partie s'arrête immédiatement : vous ne finissez même pas votre tour.",
    },
    {
      title: 'Le décompte final',
      body: "Additionnez les points de toutes les cartes visibles de votre forêt, puis ajoutez un point par carte rangée dans votre Grotte. L'appli reprend les quatre lignes du bloc de score de l'éditeur — Arbres, Haut/Bas, Gauche/Droite, Grotte — fait la conversion de la Grotte et l'addition. Ce qu'elle ne peut pas faire, c'est dire ce que vaut telle carte : cela dépend de la carte et de la disposition de votre forêt. Les cartes de référence sont là pour ça.",
    },
    {
      title: 'Quelques barèmes qui piègent',
      body: "Pour donner le ton : l'Érable rapporte autant de points qu'il y a d'arbres dans votre forêt, pousses comprises. Le Lièvre d'Europe rapporte, pour chaque lièvre, autant de points que vous avez de lièvres — cinq lièvres font donc vingt-cinq points. La Barbastelle ne rapporte ses cinq points que si trois espèces de chauves-souris différentes au moins sont présentes. Le Tilleul vaut un point, ou trois si c'est vous qui en avez le plus, égalité comprise. D'où la lenteur du décompte, et l'utilité des cartes de référence.",
    },
  ],
};
