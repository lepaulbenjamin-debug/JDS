// Définition du jeu « 7 Wonders ».
//
// Premier jeu de « salade de points » de l'appli : le score ne se construit pas
// manche après manche, il se compte une fois à la fin, catégorie par catégorie.
// Sept sources de points, dont deux que personne ne calcule juste du premier
// coup — la science (n² par symbole, plus 7 par groupe de trois différents) et
// le trésor (une pièce sur trois). C'est exactement ce que l'appli fait ici :
// on saisit ce qu'on voit sur la table, elle fait l'arithmétique.
//
// Barème vérifié sur la règle officielle (gamerules.com/rules/7-wonders).

import { lireLigne, grillesVides } from './common.js';

/** Les trois symboles scientifiques, dans l'ordre du plateau. */
export const SYMBOLES_SCIENCE = [
  { key: 'tablette', label: 'Tablette' },
  { key: 'compas', label: 'Compas' },
  { key: 'roue', label: 'Roue' },
];

/**
 * Points d'un lot de symboles scientifiques.
 * Chaque symbole rapporte le carré de son nombre d'exemplaires, et chaque
 * groupe de trois symboles différents rapporte 7 points de plus.
 */
export function pointsScience(tablette = 0, compas = 0, roue = 0) {
  const carres = tablette ** 2 + compas ** 2 + roue ** 2;
  const groupes = Math.min(tablette, compas, roue);
  return { carres, groupes, total: carres + groupes * 7 };
}

/** Points du trésor : une pièce sur trois, le reste ne compte pas. */
export function pointsTresor(pieces = 0) {
  return Math.floor(pieces / 3);
}

/** Décompte complet d'un joueur, catégorie par catégorie. */
export function decompte(form, playerId) {
  const g = lireLigne(form, 'general', playerId);
  const s = lireLigne(form, 'science', playerId);
  const science = pointsScience(s('tablette'), s('compas'), s('roue'));
  const militaire = g('victoires') - g('defaites');
  const tresor = pointsTresor(g('pieces'));

  return {
    militaire,
    tresor,
    pieces: g('pieces'),
    merveille: g('merveille'),
    bleu: g('bleu'),
    jaune: g('jaune'),
    violet: g('violet'),
    science: science.total,
    detailScience: science,
    total: militaire + tresor + g('merveille') + g('bleu') + g('jaune') + g('violet') + science.total,
  };
}

export default {
  id: 'sept-merveilles',
  name: '7 Wonders',
  tagline: 'Sept sources de points à additionner',
  /** Vignette du jeu : dessin original, voir `art` dans le README. */
  art: {
    teinte: '#fbbf24',
    // Le monument à degrés : on bâtit sa merveille par étapes.
    svg: `<path d="M13 5h6v4h-6z"/>
          <path d="M9.5 10h13v4.5h-13z" opacity=".85"/>
          <path d="M6 15.5h20V21H6z" opacity=".7"/>
          <path d="M3 22h26v6H3z"/>
          <rect x="14.4" y="23.4" width="3.2" height="4.6" rx=".6" fill="#12141c" opacity=".6"/>`,
  },
  minPlayers: 3,
  maxPlayers: 7,
  lowestWins: false,
  roundTotal: null,
  allowsNegative: false,
  supportsTokens: false,
  entry: 'form',
  // Une « manche » est ici une partie entière : le score se compte une fois,
  // à la fin. On peut en enchaîner plusieurs dans la soirée.
  roundLabel: 'Partie',
  endMode: 'rounds',
  defaultTarget: 1,
  targetChoices: [1, 2, 3],

  deal(playerCount) {
    // Chaque âge distribue 7 cartes par joueur ; on en joue 6 et la dernière
    // est défaussée. L'âge III reçoit en plus les guildes.
    return { perPlayer: 7, parAge: 7 * playerCount, guildes: playerCount + 2, tours: 6 };
  },

  form(playerCount, players) {
    return [
      {
        key: 'general',
        type: 'players',
        label: 'Le décompte',
        hint: 'Ce qui est écrit sur les cartes et les jetons. La science se saisit juste en dessous.',
        columns: [
          { key: 'victoires', label: 'Victoires', min: 0, max: 18, placeholder: '0' },
          { key: 'defaites', label: 'Défaites', min: 0, max: 6, placeholder: '0' },
          { key: 'pieces', label: 'Pièces', min: 0, max: 99, placeholder: '0' },
          { key: 'merveille', label: 'Merveille', min: 0, max: 30, placeholder: '0' },
          { key: 'bleu', label: 'Bleu', min: 0, max: 80, placeholder: '0' },
          { key: 'jaune', label: 'Jaune', min: 0, max: 60, placeholder: '0' },
          { key: 'violet', label: 'Violet', min: 0, max: 60, placeholder: '0' },
        ],
      },
      {
        key: 'science',
        type: 'players',
        label: 'Symboles scientifiques',
        hint: 'Combien de chaque symbole, pas les points : l’appli applique les carrés et les groupes de trois.',
        columns: SYMBOLES_SCIENCE.map((s) => ({ key: s.key, label: s.label, min: 0, max: 12, placeholder: '0' })),
      },
    ];
  },

  /**
   * En cas d'égalité, la règle départage au trésor : le joueur qui a le plus
   * de pièces l'emporte. On cumule sur toutes les parties de la série.
   */
  tieBreak(a, b, match) {
    const sous = (p) => (match.rounds ?? []).reduce(
      (total, r) => total + (Number(r.raw?.general?.[p.id]?.pieces) || 0),
      0,
    );
    return sous(b) - sous(a);
  },

  validateRound(form, players) {
    const manquants = players.filter((p) => grillesVides(form, ['general', 'science'], p.id));
    if (manquants.length === players.length) {
      return { ok: false, level: 'warn', message: 'Saisissez le décompte de chaque joueur.' };
    }

    // Rien n'impose de total ici : le retour utile pendant la saisie, c'est le
    // classement qui se dessine — y compris quand il manque encore des joueurs.
    const classement = players
      .filter((p) => !manquants.includes(p))
      .map((p) => ({ nom: p.name, total: decompte(form, p.id).total }))
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
      const d = decompte(form, p.id);
      scores[p.id] = d.total;
      details[p.id] = d;
    }

    const notes = [];
    const classement = [...players].sort((a, b) => scores[b.id] - scores[a.id]);
    const tete = classement[0];

    // La science est le calcul que personne ne refait de tête : on montre le
    // détail de celui qui en a le plus, c'est là que se joue souvent la partie.
    const savant = players.reduce(
      (a, p) => (details[p.id].science > details[a.id].science ? p : a),
      players[0],
    );
    const sc = details[savant.id].detailScience;
    if (sc.total > 0) {
      const carres = SYMBOLES_SCIENCE
        .map((s) => Number(form?.science?.[savant.id]?.[s.key]) || 0)
        .filter(Boolean)
        .map((n) => `${n}²`)
        .join(' + ');
      notes.push(
        `Science de ${savant.name} : ${carres} = ${sc.carres}`
        + (sc.groupes ? `, plus ${sc.groupes} groupe${sc.groupes > 1 ? 's' : ''} de trois à 7 points` : '')
        + ` → ${sc.total}.`,
      );
    }

    // Égalité : la règle départage aux pièces, le tableau ne le montre pas seul.
    const exaequo = classement.filter((p) => scores[p.id] === scores[tete.id]);
    if (exaequo.length > 1) {
      const parPieces = [...exaequo].sort((a, b) => details[b.id].pieces - details[a.id].pieces);
      notes.push(
        `${exaequo.map((p) => p.name).join(' et ')} à ${scores[tete.id]} :`
        + ` ${parPieces[0].name} l'emporte avec ${details[parPieces[0].id].pieces} pièces.`,
      );
    } else {
      notes.push(`${tete.name} l'emporte avec ${scores[tete.id]} points.`);
    }

    return { scores, notes };
  },

  pitch: "7 Wonders, c'est trois âges pendant lesquels tout le monde joue en même temps. Vous avez une main de sept cartes : vous en posez une, vous passez le reste à votre voisin, et vous recommencez. On bâtit des ressources, des bâtiments, des étapes de sa merveille, on surveille l'armée de ses deux voisins. Une partie dure une petite demi-heure quel que soit le nombre de joueurs — c'est le décompte final qui prend du temps, et c'est justement lui que l'appli fait à votre place.",

  setup(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);
    const { parAge, guildes } = this.deal(n);
    return [
      {
        title: 'Les merveilles',
        say: `Chacun prend un plateau Merveille au hasard et le pose devant soi, face A pour une première partie. À ${n} joueurs, rangez les plateaux qui restent, ils ne serviront pas.`,
      },
      {
        title: 'Le trésor',
        say: 'Posez la banque de pièces au milieu de la table, puis donnez trois pièces de valeur un à chaque joueur. C’est tout ce dont vous disposez au départ.',
      },
      {
        title: 'Trier les cartes',
        say: `Séparez les cartes en trois paquets, un par âge : le chiffre romain est au dos. Dans chaque paquet, ne gardez que les cartes dont le nombre indiqué est inférieur ou égal à ${n}. Chaque paquet doit contenir exactement ${parAge} cartes, sept par joueur.`,
      },
      {
        title: 'Les guildes',
        say: `Mettez à part les cartes violettes, les guildes. Mélangez-les, tirez-en ${guildes}, c'est-à-dire le nombre de joueurs plus deux, et mélangez-les au paquet du troisième âge. Rangez les autres sans les regarder.`,
      },
      {
        title: 'Les jetons militaires',
        say: 'Posez au centre les jetons Conflit : les jetons de victoire valent un point au premier âge, trois au deuxième et cinq au troisième. Les jetons de défaite, eux, valent moins un et ne changent jamais.',
      },
      {
        title: 'Jouer un âge',
        say: 'Au début d’un âge, chacun reçoit sept cartes. Choisissez-en une et posez-la face cachée, tous en même temps. On révèle, on paie, on construit, puis on passe le reste de sa main à son voisin. On recommence six fois : au dernier tour il ne reste que deux cartes, vous en jouez une et la dernière est défaussée.',
      },
      {
        title: 'Le sens de passage',
        say: 'Attention au sens, il change à chaque âge : au premier âge on passe à gauche, au deuxième à droite, et au troisième à gauche de nouveau.',
      },
      {
        title: 'Les conflits',
        say: 'À la fin de chaque âge, comparez votre force militaire à celle de vos deux voisins, l’un après l’autre. Plus fort : vous prenez un jeton de victoire de cet âge. Plus faible : vous prenez un jeton de défaite. À égalité, il ne se passe rien.',
      },
      {
        title: 'Le décompte',
        say: "À la fin du troisième âge, on compte. Vos jetons militaires, une pièce de victoire pour trois pièces de trésor, les étapes de votre merveille, les cartes bleues, jaunes et violettes, et enfin la science. Saisissez tout ici : l'appli fait les carrés de la science, la division du trésor et le total, et départage au trésor en cas d'égalité.",
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: "Bâtir la cité qui rapporte le plus de points de victoire en trois âges. Le total le plus élevé gagne ; en cas d'égalité, c'est le joueur qui a le plus de pièces dans son trésor qui l'emporte.",
    },
    {
      title: 'Le tour de jeu',
      body: "Sept cartes en main au début de chaque âge. Tout le monde en pose une simultanément, face cachée, puis on passe le reste de sa main à son voisin. Six tours par âge : au dernier, la carte qui reste est défaussée. On passe à gauche à l'âge I, à droite à l'âge II, à gauche à l'âge III.",
    },
    {
      title: 'Les conflits militaires',
      body: "À la fin de chaque âge, on compare sa force militaire à celle de ses deux voisins. Victoire : +1 à l'âge I, +3 à l'âge II, +5 à l'âge III. Défaite : −1 quel que soit l'âge. Égalité : rien.",
    },
    {
      title: 'Le décompte final',
      body: 'Sept sources de points : les jetons Conflit, le trésor (1 point pour 3 pièces, le reste est perdu), les étapes de merveille, les cartes bleues, les cartes jaunes qui en rapportent, les guildes violettes, et la science.',
    },
    {
      title: 'La science',
      body: "Le calcul qui piège tout le monde. Chaque symbole rapporte le carré de son nombre d'exemplaires : un symbole vaut 1, deux valent 4, trois valent 9, quatre valent 16. Et chaque groupe de trois symboles différents rapporte 7 points de plus. Trois tablettes, deux compas et une roue font donc 9 + 4 + 1, plus un groupe complet à 7 : 21 points.",
    },
    {
      title: 'Mise en place',
      body: "Un plateau Merveille par joueur (face A pour découvrir), 3 pièces chacun. Chaque paquet d'âge ne garde que les cartes marquées d'un nombre inférieur ou égal au nombre de joueurs, soit 7 cartes par joueur. On ajoute à l'âge III un nombre de guildes égal au nombre de joueurs plus deux.",
    },
    {
      title: 'À deux joueurs',
      body: "Le jeu se joue de 3 à 7 joueurs. À deux, la règle officielle ajoute une cité neutre pilotée à tour de rôle : l'appli ne la gère pas, comptez-la comme un troisième joueur si vous voulez la suivre.",
    },
  ],
};
