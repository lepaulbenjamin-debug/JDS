// Définition de la Belote classique (règles de la Fédération Française de Belote).
//
// Jeu en équipes : les deux « participants » de l'application sont les deux
// camps, comme les deux colonnes d'une feuille de score papier.
//
// Une donne distribue 162 points : 152 dans les cartes et 10 pour le dernier
// pli (« dix de der »). En cas de capot, le dix de der vaut 100 et le total
// passe à 252. La belote-rebelote ajoute 20 points, acquis même en cas de chute.
//
// Le contrat est réussi si le camp preneur totalise STRICTEMENT plus que
// l'adversaire, belote comprise. S'il chute, l'adversaire marque tout.

const TOTAL_NORMAL = 162;
const TOTAL_CAPOT = 252;
const BELOTE = 20;

/** Points remis en jeu par un litige, à reverser à la donne suivante. */
function litigeEnAttente(rounds = []) {
  const derniere = rounds[rounds.length - 1];
  return Number(derniere?.meta?.litige) || 0;
}

export default {
  id: 'belote',
  name: 'Belote',
  tagline: 'Deux camps, 162 points',
  /** Vignette du jeu : dessin original, voir `art` dans le README. */
  art: {
    teinte: '#34d399',
    // Les quatre couleurs : le jeu de 32 cartes.
    svg: `<path d="M9 4c2.2 2.6 4 4 4 5.8A2.6 2.6 0 0 1 9 12a2.6 2.6 0 0 1-4-2.2C5 8 6.8 6.6 9 4z"/>
          <path d="M23 12c-2.2-2.6-4-4-4-5.8A2.6 2.6 0 0 1 23 4a2.6 2.6 0 0 1 4 2.2c0 1.8-1.8 3.2-4 5.8z"/>
          <path d="M9 19l4 5.5-4 5.5-4-5.5z"/>
          <path d="M23 19.5c1.5 0 2.6 1.1 2.6 2.5 0 .6-.2 1.1-.5 1.5.8.4 1.4 1.3 1.4 2.3 0 1.5-1.2 2.7-2.7 2.7-.7 0-1.3-.3-1.8-.7l.5 2.2h-3l.5-2.2c-.5.4-1.1.7-1.8.7A2.7 2.7 0 0 1 15.5 25.8c0-1 .6-1.9 1.4-2.3-.3-.4-.5-.9-.5-1.5 0-1.4 1.1-2.5 2.6-2.5.9 0 1.7.5 2.1 1.2.4-.7 1.2-1.2 2.1-1.2z" opacity=".75"/>`,
  },
  // Les participants sont des équipes, pas des joueurs.
  participantLabel: 'Équipe',
  defaultNames: ['Nous', 'Eux'],
  minPlayers: 2,
  maxPlayers: 2,
  lowestWins: false,
  roundTotal: null,
  supportsTokens: false,
  // Règlement officiel de la Fédération Française de Belote, art. 10.4.2 :
  // « Si les deux camps dépassent les points fixés au même moment, c'est celui
  // qui a le plus de points au-delà qui remporte la partie. En cas d'égalité,
  // une nouvelle donne est jouée jusqu'à ce que l'égalité soit rompue. »
  tieNote: 'Règlement FFB : à égalité, on joue une nouvelle donne jusqu’à ce que l’égalité soit rompue.',

  endMode: 'target',
  defaultTarget: 1000,
  targetChoices: [500, 1000, 1500, 2000],
  entry: 'form',
  roundLabel: 'Donne',

  /** Variantes à fixer avant de commencer : elles changent le calcul. */
  options: [
    {
      key: 'litige',
      label: 'Égalité 81-81',
      hint: "La Fédération laisse chaque tournoi choisir. Avec le litige, les points du preneur sont remis en jeu pour la donne suivante.",
      options: [
        { value: 'litige', label: 'Litige (points reportés)' },
        { value: 'chute', label: 'Le preneur chute' },
        { value: 'reussi', label: 'Le preneur réussit' },
      ],
    },
    {
      key: 'arrondi',
      label: 'Arrondi des scores',
      options: [
        { value: 'non', label: 'Scores exacts' },
        { value: 'oui', label: 'Arrondis à la dizaine' },
      ],
    },
  ],

  deal() {
    return { perPlayer: 8, chien: 0, removed: 0 };
  },

  form(_playerCount, _players, rounds = []) {
    const fields = [
      { key: 'preneur', type: 'player', label: 'Qui a pris ?', hint: "Le camp qui a choisi l'atout." },
      {
        key: 'capot',
        type: 'choice',
        label: 'Capot',
        hint: 'Les huit plis pour un seul camp : le dix de der vaut alors 100, et la donne 252 points.',
        options: [
          { value: 'non', label: 'Non' },
          { value: 'preneur', label: 'Capot du preneur' },
          { value: 'defense', label: 'Capot de la défense' },
        ],
      },
      {
        key: 'points',
        type: 'number',
        label: 'Points du preneur',
        hint: 'Cartes ramassées et dix de der, sans compter la belote. Le reste va automatiquement à l\'autre camp.',
        min: 0,
        max: TOTAL_CAPOT,
      },
      {
        key: 'belote',
        type: 'choice',
        label: 'Belote-rebelote',
        hint: 'Roi et Dame d\'atout annoncés : 20 points, acquis même si le contrat chute.',
        options: [
          { value: 'aucune', label: 'Aucune' },
          { value: 'preneur', label: 'Au preneur' },
          { value: 'defense', label: 'À la défense' },
        ],
      },
    ];

    // N'apparaît que si la donne précédente a laissé des points sur le tapis.
    if (litigeEnAttente(rounds)) {
      fields.push({
        key: 'litigeRecu',
        type: 'number',
        label: 'Points de litige à reverser',
        hint: `La donne précédente a laissé ${litigeEnAttente(rounds)} points en jeu, pour le camp qui réussit celle-ci.`,
        min: 0,
        max: 300,
      });
    }
    return fields;
  },

  formDefaults(players, rounds = []) {
    const report = litigeEnAttente(rounds);
    return {
      capot: 'non',
      belote: 'aucune',
      points: '',
      ...(report ? { litigeRecu: String(report) } : {}),
    };
  },

  validateRound(form = {}, players, ctx) {
    if (!players.some((p) => p.id === form.preneur)) {
      return { ok: false, level: 'warn', message: 'Indiquez le camp qui a pris.' };
    }
    if (form.points === '' || form.points == null) {
      return { ok: false, level: 'warn', message: 'Saisissez les points du camp preneur.' };
    }
    const total = form.capot === 'non' ? TOTAL_NORMAL : TOTAL_CAPOT;
    const points = Number(form.points);
    if (Number.isNaN(points) || points < 0 || points > total) {
      return { ok: false, level: 'warn', message: `Les points du preneur vont de 0 à ${total} sur cette donne.` };
    }
    if (form.capot === 'preneur' && points !== TOTAL_CAPOT) {
      return { ok: false, level: 'warn', message: `Capot du preneur : il marque les ${TOTAL_CAPOT} points de la donne.` };
    }
    if (form.capot === 'defense' && points !== 0) {
      return { ok: false, level: 'warn', message: 'Capot de la défense : le preneur ne marque aucun point de cartes.' };
    }
    return { ok: true, level: 'ok', message: '' };
  },

  finalize(form, ctx, players) {
    const scores = Object.fromEntries(players.map((p) => [p.id, 0]));
    const preneur = players.find((p) => p.id === form.preneur);
    const defense = players.find((p) => p.id !== form.preneur);
    if (!preneur || !defense) return { scores, notes: [] };

    const total = form.capot === 'non' ? TOTAL_NORMAL : TOTAL_CAPOT;
    const cartesPreneur = Number(form.points) || 0;
    const cartesDefense = total - cartesPreneur;
    const belotePreneur = form.belote === 'preneur' ? BELOTE : 0;
    const beloteDefense = form.belote === 'defense' ? BELOTE : 0;

    // Le contrat se juge belote comprise.
    const jugePreneur = cartesPreneur + belotePreneur;
    const jugeDefense = cartesDefense + beloteDefense;
    const regleEgalite = ctx?.options?.litige ?? 'litige';
    const egalite = jugePreneur === jugeDefense;
    const reussi = egalite ? regleEgalite === 'reussi' : jugePreneur > jugeDefense;
    const litige = egalite && regleEgalite === 'litige';

    const notes = [];
    let litigeGenere = 0;

    if (litige) {
      // Le preneur ne marque rien : ses points repartent sur la donne suivante.
      scores[preneur.id] = belotePreneur;
      scores[defense.id] = cartesDefense + beloteDefense;
      litigeGenere = cartesPreneur;
      notes.push(`Litige à ${jugePreneur} partout : les ${cartesPreneur} points du preneur sont remis en jeu pour la donne suivante.`);
    } else if (reussi) {
      scores[preneur.id] = cartesPreneur + belotePreneur;
      scores[defense.id] = cartesDefense + beloteDefense;
      notes.push(`Contrat réussi : ${jugePreneur} contre ${jugeDefense}.`);
    } else {
      // Chute : l'adversaire marque tout, le preneur garde seulement sa belote.
      scores[preneur.id] = belotePreneur;
      scores[defense.id] = total + beloteDefense;
      notes.push(`${preneur.name} est dedans : ${jugePreneur} contre ${jugeDefense}. ${defense.name} marque les ${total} points de la donne.`);
    }

    // Report d'un litige précédent, acquis au camp qui réussit cette donne.
    const report = Number(form.litigeRecu) || 0;
    if (report && !litige) {
      const beneficiaire = reussi ? preneur : defense;
      scores[beneficiaire.id] += report;
      notes.push(`${beneficiaire.name} récupère les ${report} points laissés en litige.`);
    }

    if (ctx?.options?.arrondi === 'oui') {
      for (const p of players) scores[p.id] = Math.round(scores[p.id] / 10) * 10;
      notes.push('Scores arrondis à la dizaine.');
    }

    notes.push(`${preneur.name} ${scores[preneur.id]}, ${defense.name} ${scores[defense.id]}.`);
    // `meta` est conservé sur la donne : il préremplit la suivante.
    return { scores, notes, meta: { litige: litigeGenere } };
  },

  pitch: "La Belote, c'est deux camps de deux, trente-deux cartes, et une couleur d'atout qu'un joueur choisit en s'engageant à faire mieux que l'autre camp. Cent soixante-deux points se répartissent à chaque donne. Celui qui a pris doit en ramasser plus que ses adversaires, sinon il est dedans et leur laisse tout.",

  setup() {
    return [
      {
        title: 'Le matériel',
        say: "La belote se joue à quatre, en deux équipes, avec un jeu de trente-deux cartes. Les partenaires s'assoient face à face.",
      },
      {
        title: 'Distribuer',
        say: 'Le donneur distribue cinq cartes à chacun, par paquets de trois puis de deux, puis retourne la carte suivante au milieu de la table, face visible.',
      },
      {
        title: 'Prendre ou passer',
        say: "Chacun à son tour dit s'il prend la carte retournée comme atout. Si tout le monde passe, on fait un second tour où chacun peut nommer une autre couleur d'atout. Si personne ne prend, on redonne.",
      },
      {
        title: 'Finir la distribution',
        say: "Celui qui prend ramasse la carte retournée. Le donneur complète alors toutes les mains à huit cartes : trois cartes à celui qui a pris, et trois puis deux aux autres, selon la donne.",
      },
      {
        title: "L'ordre des cartes",
        say: "Attention, l'ordre change avec l'atout. À l'atout, le Valet est le plus fort et vaut vingt points, puis le Neuf qui en vaut quatorze, puis l'As, le Dix, le Roi, la Dame. Dans les autres couleurs, c'est l'As qui commande, puis le Dix, le Roi, la Dame, le Valet.",
      },
      {
        title: 'Jouer les plis',
        say: "On doit fournir la couleur demandée. Si on ne l'a pas, on doit couper à l'atout, et surcouper si l'adversaire a déjà coupé. On n'est pas obligé de monter sur son propre partenaire quand il est maître.",
      },
      {
        title: 'La belote',
        say: "Si vous avez le Roi et la Dame d'atout, annoncez « belote » en posant la première et « rebelote » en posant la seconde : cela vaut vingt points à votre équipe, et vous les gardez même si vous êtes dedans.",
      },
      {
        title: 'Compter la donne',
        say: "Le dernier pli vaut dix points de plus : c'est le dix de der. La donne fait donc cent soixante-deux points en tout. Si une équipe rafle les huit plis, c'est capot : le dix de der vaut cent, et la donne monte à deux cent cinquante-deux.",
      },
      {
        title: 'Réussi ou dedans',
        say: "Le camp qui a pris doit totaliser strictement plus que l'autre, belote comprise. S'il y arrive, chacun marque ce qu'il a fait. Sinon il est dedans, et l'adversaire marque la totalité de la donne. Saisissez simplement les points du preneur ici.",
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: "En équipes de deux, ramasser plus de points que l'adversaire sur chaque donne. On cumule jusqu'au score cible ; le plus grand total gagne.",
    },
    {
      title: 'Valeur des cartes',
      body: "À l'atout : Valet 20, Neuf 14, As 11, Dix 10, Roi 4, Dame 3, Huit et Sept 0. Dans les autres couleurs : As 11, Dix 10, Roi 4, Dame 3, Valet 2, Neuf, Huit et Sept 0. Les cartes totalisent 152 points.",
    },
    {
      title: 'Dix de der et capot',
      body: "Le dernier pli rapporte 10 points, ce qui porte la donne à 162. Si une équipe remporte les huit plis, c'est capot : le dix de der vaut 100 et la donne totalise 252 points.",
    },
    {
      title: 'Belote-rebelote',
      body: "Roi et Dame d'atout dans la même main, annoncés au moment de les jouer : 20 points pour l'équipe. Ce bonus est imprenable, il reste acquis même en cas de chute.",
    },
    {
      title: 'Réussite et chute',
      body: "Le contrat est réussi si le camp preneur totalise strictement plus que l'adversaire, belote comprise. S'il chute, il ne marque que sa belote éventuelle et l'adversaire marque les 162 points (ou 252 en cas de capot).",
    },
    {
      title: 'Litige',
      body: "En cas d'égalité parfaite (81-81, ou 91-91 avec une belote), les points du preneur sont remis en jeu et reversés au camp qui réussit la donne suivante ; l'autre camp marque ses points immédiatement. La Fédération laisse chaque table décider d'appliquer cette règle ou non : c'est un réglage au démarrage de la partie.",
    },
  ],
};
