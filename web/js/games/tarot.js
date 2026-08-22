// Définition du Tarot français (règles Fédération Française de Tarot).
//
// Contrairement aux autres jeux, on ne saisit pas un score par joueur : on
// décrit la donne (preneur, contrat, bouts, points réalisés, primes) et
// l'application calcule ce que chacun marque. C'est tout l'intérêt — la
// formule officielle est le calcul le plus pénible de la liste.
//
// Formule (du point de vue du camp preneur) :
//   base   = (25 + |écart|) × coefficient du contrat, négatif si le contrat chute
//   petit  = ±10 × coefficient, selon le camp qui mène le Petit au bout
//   poignée= prime fixe, acquise au camp vainqueur de la donne
//   chelem = prime fixe, +400 / +200 / -200
//   unité  = base + petit + poignée + chelem
// Répartition : chaque défenseur marque -unité ; le preneur marque (n-1) × unité,
// sauf à 5 joueurs avec un appelé distinct où il marque 2 × unité et l'appelé 1 ×.

/** Points à réaliser selon le nombre de bouts du preneur. */
const SEUILS = { 0: 56, 1: 51, 2: 41, 3: 36 };

const CONTRATS = [
  { value: 'petite', label: 'Petite ×1', coeff: 1 },
  { value: 'garde', label: 'Garde ×2', coeff: 2 },
  { value: 'garde-sans', label: 'Garde sans ×4', coeff: 4 },
  { value: 'garde-contre', label: 'Garde contre ×6', coeff: 6 },
];

/** Nombre d'atouts requis pour une poignée, variable selon l'effectif. */
const ATOUTS_POIGNEE = {
  3: { simple: 13, double: 15, triple: 18 },
  4: { simple: 10, double: 13, triple: 15 },
  5: { simple: 8, double: 10, triple: 13 },
};

const PRIMES_POIGNEE = { aucune: 0, simple: 20, double: 30, triple: 40 };

const CHELEM = {
  aucun: 0,
  'annonce-reussi': 400,
  'non-annonce-reussi': 200,
  'annonce-chute': -200,
};

const coeffDe = (contrat) => CONTRATS.find((c) => c.value === contrat)?.coeff ?? 1;

export default {
  id: 'tarot',
  name: 'Tarot',
  tagline: 'Le calcul fait pour vous',
  minPlayers: 3,
  maxPlayers: 5,
  // Au Tarot on cumule des scores positifs et négatifs : le meilleur total gagne.
  lowestWins: false,
  roundTotal: null,
  supportsTokens: false,
  // La partie se joue en un nombre de donnes, pas jusqu'à un score.
  endMode: 'rounds',
  defaultTarget: 16,
  targetChoices: [4, 8, 12, 16, 20, 24],
  // Saisie par formulaire : l'application calcule les scores.
  entry: 'form',
  roundLabel: 'Donne',

  deal(playerCount) {
    if (playerCount === 5) return { perPlayer: 15, chien: 3, removed: 0 };
    if (playerCount === 3) return { perPlayer: 24, chien: 6, removed: 0 };
    return { perPlayer: 18, chien: 6, removed: 0 };
  },

  /** Champs de saisie d'une donne, adaptés à l'effectif. */
  form(playerCount = 4) {
    const atouts = ATOUTS_POIGNEE[playerCount] ?? ATOUTS_POIGNEE[4];
    const fields = [
      { key: 'preneur', type: 'player', label: 'Preneur', hint: 'Celui qui a pris la donne.' },
    ];

    if (playerCount === 5) {
      fields.push({
        key: 'appele',
        type: 'player',
        label: 'Appelé',
        hint: "Le détenteur du Roi appelé. Si le preneur s'appelle lui-même, désignez-le : il joue seul contre quatre.",
      });
    }

    fields.push(
      {
        key: 'contrat',
        type: 'choice',
        label: 'Contrat',
        options: CONTRATS.map(({ value, label }) => ({ value, label })),
      },
      {
        key: 'bouts',
        type: 'choice',
        label: 'Bouts du preneur',
        hint: 'Petit, 21 et Excuse. Ils fixent le nombre de points à réaliser.',
        options: [0, 1, 2, 3].map((n) => ({ value: n, label: `${n} → ${SEUILS[n]} pts` })),
      },
      {
        key: 'points',
        type: 'number',
        label: 'Points réalisés par le preneur',
        hint: 'De 0 à 91, demi-points admis. Le demi-point va toujours au camp qui gagne la donne.',
        min: 0,
        max: 91,
        step: 0.5,
      },
      {
        key: 'petitAuBout',
        type: 'choice',
        label: 'Petit au bout',
        hint: 'Prime de 10 points, multipliée par le contrat, quel que soit le résultat de la donne.',
        options: [
          { value: 'aucun', label: 'Non' },
          { value: 'preneur', label: 'Mené par le preneur' },
          { value: 'defense', label: 'Mené par la défense' },
        ],
      },
      {
        key: 'poignee',
        type: 'choice',
        label: 'Poignée',
        hint: 'Prime fixe, acquise au camp qui gagne la donne, quel que soit celui qui l\'a annoncée.',
        options: [
          { value: 'aucune', label: 'Aucune' },
          { value: 'simple', label: `Simple (${atouts.simple} atouts) +20` },
          { value: 'double', label: `Double (${atouts.double} atouts) +30` },
          { value: 'triple', label: `Triple (${atouts.triple} atouts) +40` },
        ],
      },
      {
        key: 'chelem',
        type: 'choice',
        label: 'Chelem',
        hint: 'Tous les plis pour le camp preneur.',
        options: [
          { value: 'aucun', label: 'Aucun' },
          { value: 'annonce-reussi', label: 'Annoncé et réussi +400' },
          { value: 'non-annonce-reussi', label: 'Non annoncé mais réussi +200' },
          { value: 'annonce-chute', label: 'Annoncé et chuté −200' },
        ],
      },
    );
    return fields;
  },

  /** Valeurs par défaut d'une nouvelle donne. */
  formDefaults() {
    return { petitAuBout: 'aucun', poignee: 'aucune', chelem: 'aucun', points: '' };
  },

  validateRound(form = {}, players) {
    const nommé = (id) => players.some((p) => p.id === id);

    if (!nommé(form.preneur)) {
      return { ok: false, level: 'warn', message: 'Désignez le preneur.' };
    }
    if (players.length === 5 && !nommé(form.appele)) {
      return { ok: false, level: 'warn', message: "Désignez l'appelé (ou le preneur lui-même s'il joue seul)." };
    }
    if (!form.contrat) {
      return { ok: false, level: 'warn', message: 'Choisissez le contrat.' };
    }
    if (form.bouts == null) {
      return { ok: false, level: 'warn', message: 'Indiquez le nombre de bouts du preneur.' };
    }
    if (form.points === '' || form.points == null) {
      return { ok: false, level: 'warn', message: 'Saisissez les points réalisés par le preneur.' };
    }
    const points = Number(form.points);
    if (Number.isNaN(points) || points < 0 || points > 91) {
      return { ok: false, level: 'warn', message: 'Les points réalisés vont de 0 à 91.' };
    }
    if (Math.round(points * 2) !== points * 2) {
      return { ok: false, level: 'warn', message: 'On compte au demi-point près : 40,5 par exemple.' };
    }

    // Le détail du calcul est porté par finalize(), qui l'affiche avec la
    // répartition : inutile de le répéter ici.
    return { ok: true, level: 'ok', message: '' };
  },

  /**
   * Calcule l'unité de marque du point de vue du camp preneur, et le détail
   * du calcul pour l'afficher à la table.
   */
  settle(form, players) {
    const seuil = SEUILS[form.bouts];
    const points = Number(form.points);
    const coeff = coeffDe(form.contrat);
    const contrat = CONTRATS.find((c) => c.value === form.contrat);

    // Le demi-point va au camp qui gagne la donne : il ne peut donc jamais
    // faire basculer le résultat, seulement arrondir l'écart en sa faveur.
    const reussi = points >= seuil;
    const retenus = reussi ? Math.ceil(points) : Math.floor(points);
    const ecart = retenus - seuil;

    const base = (25 + Math.abs(ecart)) * coeff * (reussi ? 1 : -1);
    const petit = form.petitAuBout === 'preneur' ? 10 * coeff
      : form.petitAuBout === 'defense' ? -10 * coeff
        : 0;
    const poignee = (PRIMES_POIGNEE[form.poignee] ?? 0) * (reussi ? 1 : -1);
    const chelem = CHELEM[form.chelem] ?? 0;
    const unit = base + petit + poignee + chelem;

    const morceaux = [`(25 ${ecart >= 0 ? '+' : '\u2212'} ${Math.abs(ecart)}) × ${coeff} = ${base < 0 ? '\u2212' : ''}${Math.abs(base)}`];
    if (petit) morceaux.push(`petit au bout ${fmt(petit)}`);
    if (poignee) morceaux.push(`poignée ${fmt(poignee)}`);
    if (chelem) morceaux.push(`chelem ${fmt(chelem)}`);

    const detail = `${contrat?.label.replace(/ ×\d$/, '') ?? 'Contrat'} ${reussi ? 'réussie' : 'chutée'} de ${Math.abs(ecart)} `
      + `(${retenus} sur ${seuil} avec ${form.bouts} bout${form.bouts > 1 ? 's' : ''}) : ${morceaux.join(', ')}`;

    return { unit, ecart, reussi, base, petit, poignee, chelem, detail, players };
  },

  /** Répartit l'unité de marque entre les joueurs. Le total fait toujours 0. */
  finalize(form, ctx, players) {
    const scores = Object.fromEntries(players.map((p) => [p.id, 0]));
    const preneur = players.find((p) => p.id === form.preneur);
    if (!preneur) return { scores, notes: [] };

    const { unit, detail } = this.settle(form, players);
    const appele = players.find((p) => p.id === form.appele);
    // À 5 joueurs, un appelé distinct prend une part et le preneur deux.
    const enEquipe = players.length === 5 && appele && appele.id !== preneur.id;

    for (const p of players) scores[p.id] = -unit;
    if (enEquipe) {
      scores[preneur.id] = 2 * unit;
      scores[appele.id] = unit;
    } else {
      scores[preneur.id] = (players.length - 1) * unit;
    }

    const notes = [detail + '.'];
    if (enEquipe) {
      notes.push(`${preneur.name} ${fmt(scores[preneur.id])}, ${appele.name} ${fmt(scores[appele.id])}, les autres ${fmt(-unit)}.`);
    } else {
      const seul = players.length === 5 ? ' (seul contre quatre)' : '';
      notes.push(`${preneur.name}${seul} ${fmt(scores[preneur.id])}, les autres ${fmt(-unit)}.`);
    }
    return { scores, notes };
  },

  vision: {
    context: `Règles du Tarot utiles à la lecture :
- Les scores d'une donne sont positifs pour le camp gagnant et négatifs pour l'autre, et leur somme fait toujours zéro.
- Le preneur marque un multiple de ce que marque chaque défenseur.`,
  },

  pitch: "Le Tarot, c'est un jeu de plis à 78 cartes où l'un des joueurs s'engage seul contre les autres à réaliser un contrat. Ce qu'il doit atteindre dépend des trois bouts qu'il ramasse : le Petit, le 21 et l'Excuse. Plus il en a, moins il lui faut de points. Tout le sel est là — et le calcul du score, lui, sera fait par cette application.",

  setup(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);
    const { perPlayer, chien } = this.deal(n);
    const parPaquet = n === 3 ? 'quatre par quatre' : 'trois par trois';

    return [
      {
        title: 'Le matériel',
        say: "Le Tarot se joue avec un jeu de 78 cartes : quatre couleurs de quatorze cartes, avec Valet, Cavalier, Dame et Roi, plus vingt et un atouts numérotés et l'Excuse.",
      },
      {
        title: 'Les trois bouts',
        say: "Repérez tout de suite les trois cartes maîtresses, qu'on appelle les bouts : le 1 d'atout, qu'on nomme le Petit, le 21 d'atout, et l'Excuse. Ce sont elles qui décident du niveau de difficulté du contrat.",
      },
      {
        title: 'Distribuer',
        say: `À ${n} joueurs, distribuez les cartes ${parPaquet}, dans le sens inverse des aiguilles d'une montre. Chacun reçoit ${perPlayer} cartes. En distribuant, mettez de côté, une par une, ${chien} cartes qui formeront le chien : jamais la première ni la dernière carte du paquet.`,
      },
      {
        title: 'Les enchères',
        say: "Chacun regarde son jeu, puis annonce à son tour : je passe, je prise, je garde, je garde sans le chien, ou je garde contre le chien. Le contrat le plus élevé l'emporte, et celui qui l'a annoncé devient le preneur.",
      },
      n === 5 && {
        title: 'Appeler un roi',
        say: "Avant de retourner le chien, le preneur appelle un roi. Celui qui le détient devient son partenaire, sans le dire : on ne le découvrira qu'au moment où ce roi sera joué. Si le preneur s'appelle lui-même, il joue seul contre les quatre autres.",
      },
      {
        title: 'Le chien et l’écart',
        say: `Sur une prise ou une garde, le preneur retourne le chien pour que tout le monde le voie, le prend, puis écarte ${chien} cartes face cachée. Il ne peut écarter ni roi ni bout. Sur une garde sans, le chien reste caché et compte pour le preneur ; sur une garde contre, il compte pour la défense.`,
      },
      {
        title: 'Ce que le preneur doit réaliser',
        say: "Le seuil dépend des bouts qu'il aura ramassés à la fin : sans bout, il lui faut cinquante-six points ; avec un bout, cinquante et un ; avec deux bouts, quarante et un ; et avec trois bouts, seulement trente-six.",
      },
      {
        title: 'Le jeu de la carte',
        say: "On est obligé de fournir la couleur demandée, et à l'atout on est obligé de monter, même sur son partenaire. Si on n'a pas la couleur, on est obligé de couper, et de surcouper si quelqu'un a déjà coupé. On ne se défausse que si on n'a ni la couleur ni d'atout.",
      },
      {
        title: 'Compter la donne',
        say: 'À la fin, comptez les points du preneur en associant chaque carte forte à une petite carte : un bout ou un roi vaut cinq, une dame quatre, un cavalier trois, un valet deux, et deux petites cartes valent un. Saisissez ce total ici avec le contrat et les bouts : l\'application fait le reste du calcul.',
      },
    ].filter(Boolean);
  },

  rules: [
    {
      title: 'But du jeu',
      body: "Le preneur s'engage à réaliser un nombre de points contre les autres joueurs. Les scores d'une donne s'équilibrent toujours à zéro ; on cumule sur plusieurs donnes et le plus grand total gagne.",
    },
    {
      title: 'Points à réaliser',
      body: 'Sans bout : 56 points. Avec un bout : 51. Avec deux bouts : 41. Avec trois bouts : 36. Les bouts sont le Petit (1 d\'atout), le 21 et l\'Excuse.',
    },
    {
      title: 'Valeur des cartes',
      body: 'Chaque carte forte se compte avec une petite carte : bout ou roi 5, dame 4, cavalier 3, valet 2, deux petites cartes 1. Total du jeu : 91 points. On compte au demi-point près, et le demi-point va toujours au camp qui gagne la donne.',
    },
    {
      title: 'Distribution',
      body: '3 joueurs : 24 cartes chacun, chien de 6, distribution 4 par 4. 4 joueurs : 18 cartes, chien de 6, distribution 3 par 3. 5 joueurs : 15 cartes, chien de 3, distribution 3 par 3, avec appel d\'un roi.',
    },
    {
      title: 'Le calcul du score',
      body: "(25 + écart) multiplié par le contrat : petite ×1, garde ×2, garde sans ×4, garde contre ×6. On ajoute ensuite le petit au bout (10 points, multipliés par le contrat), la poignée et le chelem (primes fixes, non multipliées). Chaque défenseur marque l'opposé de ce total ; le preneur en marque autant de fois qu'il y a de défenseurs.",
    },
    {
      title: 'Les primes',
      body: "Poignée : 20, 30 ou 40 points selon le nombre d'atouts présentés (10/13/15 à 4 joueurs, 8/10/13 à 5, 13/15/18 à 3) ; elle revient au camp qui gagne la donne, quel qu'en soit l'annonceur. Petit au bout : 10 points au camp qui remporte la dernière levée avec le Petit. Chelem : 400 annoncé et réussi, 200 réussi sans annonce, −200 annoncé et manqué.",
    },
    {
      title: 'Ce que l’appli ne calcule pas',
      body: "Le chelem réalisé par la défense contre le preneur, cas rare, n'est pas proposé dans la saisie : reportez-le à la main si vous le rencontrez.",
    },
  ],
};

/** Nombre signé avec un vrai signe moins typographique. */
function fmt(value) {
  return value < 0 ? `\u2212${Math.abs(value)}` : `+${value}`;
}
