// Définition de Skull King (règles officielles de l'édition 2022).
//
// Dix manches : on distribue une carte à la première, deux à la deuxième, et
// ainsi de suite. Avant de jouer, chacun annonce le nombre exact de plis qu'il
// pense remporter. Tout le sel du décompte est là :
//   - mise d'au moins 1, tenue exactement : 20 points par pli ;
//   - mise ratée : −10 par pli d'écart, et rien pour les plis réalisés ;
//   - mise à zéro tenue : +10 × le nombre de cartes de la manche ;
//   - mise à zéro ratée : −10 × le nombre de cartes de la manche.
//
// Les bonus (cartes 14, sirènes, pirates, Skull King) sont saisis à part :
// l'application ne devine pas ce qui s'est passé dans les plis.

const MANCHES_MAX = 10;

export default {
  id: 'skull-king',
  name: 'Skull King',
  tagline: 'Annoncer juste, ou payer',
  minPlayers: 2,
  maxPlayers: 8,
  lowestWins: false,
  roundTotal: null,
  supportsTokens: false,
  endMode: 'rounds',
  defaultTarget: 10,
  targetChoices: [5, 7, 10],
  entry: 'form',

  options: [
    {
      key: 'bonus',
      label: 'Les points bonus',
      hint: "La règle 2022 les accorde toujours. Beaucoup de tables appliquent l'ancienne, qui les réserve aux joueurs ayant tenu leur mise.",
      options: [
        { value: 'toujours', label: 'Toujours (règle 2022)' },
        { value: 'si-mise-tenue', label: 'Seulement si la mise est tenue' },
      ],
    },
  ],

  deal(playerCount) {
    return { perPlayer: MANCHES_MAX, removed: 0, joueurs: playerCount };
  },

  form(playerCount, players, rounds = []) {
    return [
      {
        key: 'cartes',
        type: 'number',
        label: 'Cartes distribuées',
        hint: "Une de plus à chaque manche. À 7 ou 8 joueurs, le paquet peut obliger à en distribuer moins sur les dernières.",
        min: 1,
        max: MANCHES_MAX,
      },
      {
        key: 'joueurs',
        type: 'players',
        label: 'Mise et résultat',
        hint: 'Le total des plis réalisés doit égaler le nombre de cartes distribuées.',
        columns: [
          { key: 'mise', label: 'Mise', min: 0, max: (match, form) => Number(form.cartes) || MANCHES_MAX },
          { key: 'plis', label: 'Plis', min: 0, max: (match, form) => Number(form.cartes) || MANCHES_MAX },
          { key: 'bonus', label: 'Bonus', min: 0, max: 500 },
        ],
      },
    ];
  },

  formDefaults(players = [], rounds = []) {
    // Par défaut, autant de cartes que le numéro de la manche.
    return { cartes: String(Math.min(rounds.length + 1, MANCHES_MAX)), joueurs: {} };
  },

  /** Score d'un joueur sur une manche, hors bonus. */
  scoreMise(mise, plis, cartes) {
    if (mise === 0) return (plis === 0 ? 10 : -10) * cartes;
    return plis === mise ? 20 * mise : -10 * Math.abs(plis - mise);
  },

  validateRound(form = {}, players) {
    const cartes = Number(form.cartes);
    if (!cartes || cartes < 1 || cartes > MANCHES_MAX) {
      return { ok: false, level: 'warn', message: `Indiquez le nombre de cartes distribuées (1 à ${MANCHES_MAX}).` };
    }

    const lignes = form.joueurs ?? {};
    const incomplets = players.filter((p) => {
      const l = lignes[p.id] ?? {};
      return l.mise === '' || l.mise == null || l.plis === '' || l.plis == null;
    });
    if (incomplets.length) {
      return {
        ok: false,
        level: 'warn',
        message: `Mise et plis manquants pour ${incomplets.map((p) => p.name).join(', ')}.`,
      };
    }

    const horsBornes = players.filter((p) => {
      const l = lignes[p.id];
      return [Number(l.mise), Number(l.plis)].some((v) => Number.isNaN(v) || v < 0 || v > cartes);
    });
    if (horsBornes.length) {
      return {
        ok: false,
        level: 'warn',
        message: `Mise et plis vont de 0 à ${cartes} : à revoir pour ${horsBornes.map((p) => p.name).join(', ')}.`,
      };
    }

    const plisTotal = players.reduce((sum, p) => sum + Number(lignes[p.id].plis), 0);
    if (plisTotal !== cartes) {
      const ecart = plisTotal - cartes;
      return {
        ok: false,
        level: 'warn',
        message: `${plisTotal} plis répartis pour ${cartes} distribués : il y en a ${ecart > 0 ? `${ecart} de trop` : `${-ecart} en trop peu`}.`,
      };
    }
    return { ok: true, level: 'ok', message: '' };
  },

  finalize(form, ctx, players) {
    const cartes = Number(form.cartes) || 1;
    const lignes = form.joueurs ?? {};
    const bonusToujours = (ctx?.options?.bonus ?? 'toujours') === 'toujours';

    const scores = {};
    const details = [];
    for (const p of players) {
      const ligne = lignes[p.id] ?? {};
      const mise = Number(ligne.mise) || 0;
      const plis = Number(ligne.plis) || 0;
      const bonus = Number(ligne.bonus) || 0;
      const tenue = mise === 0 ? plis === 0 : plis === mise;

      const base = this.scoreMise(mise, plis, cartes);
      const bonusRetenu = bonus && (bonusToujours || tenue) ? bonus : 0;
      scores[p.id] = base + bonusRetenu;

      const morceaux = [`${base > 0 ? '+' : ''}${base}`];
      if (bonusRetenu) morceaux.push(`bonus +${bonusRetenu}`);
      else if (bonus) morceaux.push(`bonus ${bonus} perdu`);
      details.push(`${p.name} ${mise}/${plis} ${morceaux.join(' ')}`);
    }

    const rates = players.filter((p) => {
      const l = lignes[p.id] ?? {};
      const mise = Number(l.mise) || 0;
      const plis = Number(l.plis) || 0;
      return mise === 0 ? plis !== 0 : plis !== mise;
    });

    const notes = [
      `${cartes} carte${cartes > 1 ? 's' : ''} : ${details.join(' · ')}.`,
    ];
    if (rates.length) notes.push(`Mise ratée pour ${rates.map((p) => p.name).join(', ')}.`);
    return { scores, notes };
  },

  pitch: "Skull King, c'est un jeu de plis où vous annoncez à l'avance combien vous allez en remporter — et où vous n'êtes payé que si vous tombez juste. Une carte à la première manche, dix à la dixième. Trop gourmand ou trop prudent, vous perdez des points. Il y a des pirates, une sirène et un roi des mers pour rendre la prévision impossible.",

  setup(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);
    return [
      {
        title: 'Le principe',
        say: "Skull King se joue en dix manches. À la première, chacun reçoit une seule carte ; à la deuxième, deux ; et ainsi de suite jusqu'à dix.",
      },
      {
        title: 'Distribuer',
        say: `Mélangez tout le paquet, y compris les cartes de la manche précédente, et donnez à chacun des ${n} joueurs le nombre de cartes de la manche en cours.`,
      },
      {
        title: 'Annoncer sa mise',
        say: "Regardez votre main et estimez le nombre exact de plis que vous allez remporter. Quand tout le monde est prêt, on frappe trois fois du poing sur la table en criant Yo-ho-ho, et au troisième coup chacun tend autant de doigts que de plis annoncés — poing fermé pour zéro.",
      },
      {
        title: 'Les couleurs',
        say: 'Il y a quatre couleurs numérotées : vert, violet, jaune, et le noir qui est atout. On doit suivre la couleur demandée si on en a. Les cartes noires battent les autres couleurs.',
      },
      {
        title: 'Les cartes spéciales',
        say: "Les cartes sans numéro ne se suivent jamais. Les pirates battent toutes les cartes numérotées, le Skull King bat les pirates, et la sirène, elle, bat le Skull King. Elles se battent dans cet ordre, en boucle.",
      },
      {
        title: 'Le décompte',
        say: "Si vous tenez exactement votre mise, vous marquez vingt points par pli annoncé. Si vous vous trompez, vous perdez dix points par pli d'écart et ne gagnez rien pour vos plis.",
      },
      {
        title: 'La mise à zéro',
        say: "Annoncer zéro est un pari à part : si vous ne prenez aucun pli, vous marquez dix points multipliés par le nombre de cartes de la manche. Mais si vous en prenez un seul, vous perdez la même somme.",
      },
      {
        title: 'Les bonus',
        say: "Gardez un œil sur les bonus : dix points par carte quatorze de couleur que vous avez en fin de manche, vingt pour la quatorze noire, vingt par sirène capturée par un pirate, trente par pirate capturé par le Skull King, et quarante si votre sirène attrape le Skull King. Vous les saisirez dans la colonne Bonus.",
      },
      {
        title: 'Enchaîner',
        say: "Notez les mises et les plis réalisés ici après chaque manche, puis redistribuez avec une carte de plus. Après la dixième manche, le plus grand total est élu capitaine des sept mers.",
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: 'Annoncer exactement le nombre de plis que l\'on va remporter, dix manches de suite. Le plus grand total gagne.',
    },
    {
      title: 'Mise d\'au moins 1',
      body: "Tenue exactement : 20 points par pli annoncé. Ratée : −10 point par pli d'écart, et aucun point pour les plis réalisés.",
    },
    {
      title: 'Mise à zéro',
      body: 'Tenue : +10 points par carte distribuée dans la manche. Ratée : −10 points par carte distribuée. C\'est le pari le plus payant et le plus risqué des premières manches.',
    },
    {
      title: 'Points bonus',
      body: '10 points par carte 14 de couleur possédée en fin de manche, 20 pour la 14 noire ; 20 par sirène capturée par un pirate, 30 par pirate capturé par le Skull King, 40 si votre sirène capture le Skull King.',
    },
    {
      title: 'Une règle qui varie',
      body: "L'édition 2022 accorde les bonus quelle que soit la réussite de la mise. Beaucoup de tables appliquent l'ancienne règle, qui les réserve à ceux qui ont tenu leur mise : le choix se fait au démarrage de la partie.",
    },
    {
      title: 'Distribution',
      body: "Une carte à la manche 1, deux à la manche 2, jusqu'à dix à la manche 10. À 7 ou 8 joueurs, le paquet ne suffit plus sur les dernières manches : on distribue alors moins de cartes, à égalité entre tous.",
    },
  ],
};
