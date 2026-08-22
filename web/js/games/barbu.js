// Définition du jeu « Le Barbu ».
//
// Une succession de manches courtes, chacune avec son propre contrat : ne pas
// faire de plis, ne pas ramasser de cœurs, éviter les dames, éviter le roi de
// cœur (le Barbu), éviter les derniers plis, tout éviter à la fois (la salade),
// et enfin se débarrasser de ses cartes le plus vite possible (la réussite).
//
// Les barèmes ci-dessous suivent la version française la plus répandue
// (règle Ducale, Règles.com, Règles-jeu.fr). Le Barbu étant un jeu de tradition
// orale, les points varient d'une famille à l'autre : les écarts constatés
// entre ces sources sont exposés en options de partie plutôt que tranchés ici.

import { nomDe } from './common.js';

export const CONTRATS_BARBU = [
  { value: 'plis', label: 'Les plis' },
  { value: 'coeurs', label: 'Les cœurs' },
  { value: 'dames', label: 'Les dames' },
  { value: 'barbu', label: 'Le Barbu' },
  { value: 'derniers', label: 'Les derniers plis' },
  { value: 'salade', label: 'La salade' },
  { value: 'reussite', label: 'La réussite' },
];

const NB_COEURS = 13;
const NB_DAMES = 4;

/** Barème effectif de la partie, options de table appliquées. */
export function bareme(ctx) {
  const o = ctx?.options ?? {};
  return {
    pli: -10,
    coeur: -10,
    dame: -20,
    barbu: -(Number(o.barbuValeur) || 50),
    dernier: -50,
    avantDernier: o.derniersPlis === 'un' ? 0 : -30,
    deuxDerniers: o.derniersPlis !== 'un',
    reussite: o.reussite === 'rangs' ? 'rangs' : 'cent',
  };
}

/** Points de la réussite pour une place donnée, selon la variante choisie. */
export function pointsReussite(place, nbJoueurs, variante) {
  if (!place) return 0;
  if (variante === 'rangs') {
    // La pénalité du dernier prime : à 3 joueurs, le troisième est le dernier.
    if (place === nbJoueurs) return -10;
    if (place === 1) return 45;
    if (place === 2) return 20;
    if (place === 3) return 10;
    return 0;
  }
  if (place === 1) return 100;
  if (place === 2) return 50;
  return 0;
}

/**
 * Nombre de cartes distribuées et cartes écartées.
 * On joue avec 52 cartes ; quand le compte ne tombe pas juste, on retire les
 * plus petites cartes noires et carreau — jamais un cœur, jamais une dame,
 * pour que les contrats gardent leur valeur.
 */
export function distribution(playerCount) {
  const reste = 52 % playerCount;
  const enJeu = 52 - reste;
  return { removed: reste, perPlayer: enJeu / playerCount, plis: enJeu / playerCount };
}

/** Valeur saisie dans une grille joueur × colonne. */
function cellule(form, cle, playerId) {
  return Number(form?.[cle]?.[playerId]?.n) || 0;
}

function place(form, playerId) {
  return Number(form?.places?.[playerId]?.place) || 0;
}

function somme(form, cle, players) {
  return players.reduce((total, p) => total + cellule(form, cle, p.id), 0);
}

export default {
  id: 'barbu',
  name: 'Le Barbu',
  tagline: 'Sept contrats, sept façons de perdre',
  minPlayers: 3,
  maxPlayers: 6,
  // Les points sont surtout des pénalités : le meilleur total est le plus haut.
  lowestWins: false,
  roundTotal: null,
  allowsNegative: true,
  supportsTokens: false,
  entry: 'form',
  roundLabel: 'Manche',
  // Sept contrats : un tour complet fait sept manches.
  endMode: 'rounds',
  defaultTarget: 7,
  targetChoices: [7, 14, 21, 28],

  options: [
    {
      key: 'barbuValeur',
      label: 'Ce que coûte le Barbu',
      hint: 'Le roi de cœur vaut −50 chez les uns, −80 chez les autres. Choisissez votre habitude.',
      options: [
        { value: 50, label: '−50 points' },
        { value: 80, label: '−80 points' },
      ],
    },
    {
      key: 'derniersPlis',
      label: 'Le contrat des derniers plis',
      hint: 'Certaines tables comptent aussi l’avant-dernier pli, d’autres seulement le dernier.',
      options: [
        { value: 'deux', label: 'Les deux derniers (−30 / −50)' },
        { value: 'un', label: 'Le dernier seulement (−50)' },
      ],
    },
    {
      key: 'reussite',
      label: 'Ce que rapporte la réussite',
      hint: 'La manche qui permet de remonter au score. Deux barèmes courants.',
      options: [
        { value: 'cent', label: '+100 au 1er, +50 au 2e' },
        { value: 'rangs', label: '+45 / +20 / +10, −10 au dernier' },
      ],
    },
  ],

  deal(playerCount) {
    return distribution(playerCount);
  },

  /**
   * Le formulaire change avec le contrat : on ne demande que ce qui compte.
   * `form` est la saisie en cours, d'où la dépendance au contrat choisi.
   */
  form(playerCount, players, rounds = [], form = {}) {
    // Un contrat déjà joué reste proposé (on peut vouloir le rejouer), mais il
    // est signalé pour éviter de doubler par inadvertance.
    const joues = new Set(rounds.map((r) => r.raw?.contrat).filter(Boolean));
    const champs = [{
      key: 'contrat',
      type: 'choice',
      label: 'Le contrat de cette manche',
      hint: 'Le meneur annonce ce qu’il faut éviter. ✓ = déjà joué.',
      options: CONTRATS_BARBU.map((c) => ({
        value: c.value,
        label: joues.has(c.value) ? `${c.label} ✓` : c.label,
      })),
    }];

    const contrat = form.contrat;
    if (!contrat) return champs;

    const { plis } = distribution(playerCount);
    const grille = (key, label, hint, max) => ({
      key,
      type: 'players',
      label,
      hint,
      columns: [{ key: 'n', label, min: 0, max }],
    });

    if (contrat === 'plis' || contrat === 'salade') {
      champs.push(grille('plis', 'Plis', `Combien de plis chacun a ramassés (${plis} en tout).`, plis));
    }
    if (contrat === 'coeurs' || contrat === 'salade') {
      champs.push(grille('coeurs', 'Cœurs', `Combien de cœurs chacun a ramassés (${NB_COEURS} en tout).`, NB_COEURS));
    }
    if (contrat === 'dames' || contrat === 'salade') {
      champs.push(grille('dames', 'Dames', `Combien de dames chacun a ramassées (${NB_DAMES} en tout).`, NB_DAMES));
    }
    if (contrat === 'barbu' || contrat === 'salade') {
      champs.push({
        key: 'barbuJoueur',
        type: 'player',
        label: 'Qui a ramassé le Barbu ?',
        hint: 'Le roi de cœur.',
      });
    }
    if (contrat === 'derniers' || contrat === 'salade') {
      champs.push({
        key: 'dernierJoueur',
        type: 'player',
        label: 'Qui a fait le dernier pli ?',
        hint: 'Le pli numéro ' + plis + '.',
      });
      champs.push({
        key: 'avantDernierJoueur',
        type: 'player',
        label: 'Qui a fait l’avant-dernier pli ?',
        hint: 'Laissez vide si votre table ne compte que le dernier.',
      });
    }
    if (contrat === 'reussite') {
      champs.push({
        key: 'places',
        type: 'players',
        label: 'Ordre d’arrivée',
        hint: 'Dans quel ordre chacun s’est débarrassé de ses cartes : 1 pour le premier.',
        columns: [{ key: 'place', label: 'Place', min: 1, max: playerCount }],
      });
    }
    return champs;
  },

  /** À l'ouverture d'une manche, on propose le premier contrat non encore joué. */
  formDefaults(players, rounds = []) {
    const joues = new Set(rounds.map((r) => r.raw?.contrat).filter(Boolean));
    const suivant = CONTRATS_BARBU.find((c) => !joues.has(c.value));
    return { contrat: suivant?.value ?? CONTRATS_BARBU[0].value };
  },

  /** Intitulé de la manche dans l'historique : le contrat, pas un numéro. */
  roundLine(round, index) {
    const contrat = CONTRATS_BARBU.find((c) => c.value === round.raw?.contrat);
    return contrat ? { title: `${index + 1}. ${contrat.label}` } : {};
  },

  validateRound(form, players, ctx) {
    const contrat = form?.contrat;
    if (!contrat) {
      return { ok: false, level: 'warn', message: 'Choisissez le contrat joué sur cette manche.' };
    }
    const b = bareme(ctx);
    const { plis } = distribution(players.length);
    const libelle = CONTRATS_BARBU.find((c) => c.value === contrat).label;
    const manques = [];

    const verifieGrille = (cle, attendu, nom) => {
      const total = somme(form, cle, players);
      if (total !== attendu) {
        manques.push(`${total} ${nom} répartis sur ${attendu}`);
      }
    };

    if (contrat === 'plis' || contrat === 'salade') verifieGrille('plis', plis, 'plis');
    if (contrat === 'coeurs' || contrat === 'salade') verifieGrille('coeurs', NB_COEURS, 'cœurs');
    if (contrat === 'dames' || contrat === 'salade') verifieGrille('dames', NB_DAMES, 'dames');

    if ((contrat === 'barbu' || contrat === 'salade') && !form.barbuJoueur) {
      manques.push('personne n’a le Barbu');
    }
    if ((contrat === 'derniers' || contrat === 'salade') && !form.dernierJoueur) {
      manques.push('le dernier pli n’est attribué à personne');
    }
    if (contrat === 'derniers' && b.deuxDerniers && !form.avantDernierJoueur) {
      manques.push('l’avant-dernier pli n’est attribué à personne');
    }

    if (contrat === 'reussite') {
      const places = players.map((p) => place(form, p.id));
      if (places.some((v) => v < 1)) {
        manques.push('il manque des places dans l’ordre d’arrivée');
      } else if (new Set(places).size !== players.length) {
        manques.push('deux joueurs occupent la même place');
      } else if (Math.max(...places) !== players.length) {
        manques.push(`les places doivent aller de 1 à ${players.length}`);
      }
    }

    if (manques.length) {
      return { ok: false, level: 'warn', message: `${libelle} : ${manques.join(', ')}.` };
    }
    return { ok: true, level: 'ok', message: `${libelle} — le compte est bon.` };
  },

  /** Applique le barème du contrat annoncé. */
  finalize(form, ctx, players) {
    const b = bareme(ctx);
    const contrat = form?.contrat;
    const scores = Object.fromEntries(players.map((p) => [p.id, 0]));
    const notes = [];
    if (!contrat) return { scores, notes };

    const ajoute = (playerId, points) => {
      if (playerId && playerId in scores) scores[playerId] += points;
    };

    const salade = contrat === 'salade';

    if (contrat === 'plis' || salade) {
      for (const p of players) scores[p.id] += cellule(form, 'plis', p.id) * b.pli;
    }
    if (contrat === 'coeurs' || salade) {
      for (const p of players) scores[p.id] += cellule(form, 'coeurs', p.id) * b.coeur;
    }
    if (contrat === 'dames' || salade) {
      for (const p of players) scores[p.id] += cellule(form, 'dames', p.id) * b.dame;
    }
    if (contrat === 'barbu' || salade) {
      ajoute(form.barbuJoueur, b.barbu);
      if (form.barbuJoueur) {
        notes.push(`Le Barbu coûte ${b.barbu} à ${nomDe(players, form.barbuJoueur)}.`);
      }
    }
    if (contrat === 'derniers' || salade) {
      ajoute(form.dernierJoueur, b.dernier);
      if (b.deuxDerniers) ajoute(form.avantDernierJoueur, b.avantDernier);
    }
    if (contrat === 'reussite') {
      for (const p of players) {
        scores[p.id] = pointsReussite(place(form, p.id), players.length, b.reussite);
      }
      const premier = players.find((p) => place(form, p.id) === 1);
      if (premier) {
        notes.push(`${premier.name} se débarrasse le premier : ${scores[premier.id] > 0 ? '+' : ''}${scores[premier.id]}.`);
      }
    }

    // Sur les contrats à ramasser, on rappelle qui a le plus souffert.
    if (contrat !== 'reussite') {
      const pire = players.reduce((a, p) => (scores[p.id] < scores[a.id] ? p : a), players[0]);
      if (pire && scores[pire.id] < 0) {
        notes.push(`${pire.name} encaisse le plus : ${scores[pire.id]}.`);
      }
      const indemnes = players.filter((p) => scores[p.id] === 0);
      if (indemnes.length && indemnes.length < players.length) {
        notes.push(`${indemnes.map((p) => p.name).join(', ')} ${indemnes.length > 1 ? 'passent' : 'passe'} sans rien prendre.`);
      }
    }

    return { scores, notes, meta: { contrat } };
  },

  pitch: "Le Barbu, ce n'est pas un jeu, c'est sept jeux à la suite. À chaque manche, celui qui a la main annonce ce qu'il faut éviter : faire des plis, ramasser des cœurs, prendre les dames, hériter du roi de cœur — le Barbu — ou finir sur les derniers plis. Une manche les cumule tous, c'est la salade. Et la dernière, la réussite, remet tout le monde en course : le premier à se débarrasser de ses cartes rafle la mise. Tout se compte en points de pénalité, alors le vainqueur est celui qui en a le moins pris.",

  setup(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);
    const { perPlayer, removed } = distribution(n);
    return [
      {
        title: 'Le matériel',
        say: 'Le Barbu se joue avec un jeu de cinquante-deux cartes. Les cartes vont du deux, la plus faible, jusqu’à l’as, la plus forte. Il n’y a pas d’atout.',
      },
      {
        title: 'Distribuer',
        say: removed
          ? `À ${n} joueurs, retirez d'abord ${removed} petite${removed > 1 ? 's' : ''} carte${removed > 1 ? 's' : ''} noire${removed > 1 ? 's' : ''} ou carreau — surtout pas un cœur ni une dame, elles comptent. Distribuez ensuite tout le paquet : ${perPlayer} cartes chacun.`
          : `Distribuez tout le paquet, une carte à la fois : chacun des ${n} joueurs reçoit ${perPlayer} cartes.`,
      },
      {
        title: 'Le meneur annonce',
        say: 'À chaque manche, un joueur a la main : c’est lui qui annonce le contrat, autrement dit ce qu’il faudra éviter de ramasser. La main tourne ensuite vers la gauche, et un contrat déjà joué ne se rejoue pas dans le tour.',
      },
      {
        title: 'Jouer les plis',
        say: 'Le meneur entame avec la carte de son choix. Chacun doit fournir la couleur demandée s’il en a une, sinon il se défausse de ce qu’il veut. La plus forte carte de la couleur demandée remporte le pli et entame le suivant.',
      },
      {
        title: 'Les cinq contrats à éviter',
        say: 'Voici ce qu’on peut vous demander d’éviter. Les plis : chaque pli ramassé coûte dix points. Les cœurs : chaque cœur coûte dix points. Les dames : chacune coûte vingt points. Le Barbu : le roi de cœur, à lui seul, coûte cinquante points. Et les derniers plis : le dernier en coûte cinquante, l’avant-dernier trente. Ce sont les points les plus courants ; si votre table joue autrement, réglez-le au moment de créer la partie.',
      },
      {
        title: 'La salade',
        say: 'La salade, c’est tout en même temps : les plis, les cœurs, les dames, le Barbu et les derniers plis se comptent ensemble sur la même manche. C’est la manche la plus chère de la partie, celle où l’on peut vraiment décrocher.',
      },
      {
        title: 'La réussite',
        say: 'La dernière manche change complètement. On ne fait plus de plis : chacun à son tour pose une carte pour construire des suites au milieu de la table. Le but est de se débarrasser de sa main. Le premier à y arriver marque cent points, le deuxième cinquante. C’est la manche qui permet de remonter.',
      },
      {
        title: 'Compter',
        say: 'Notez les points ici après chaque manche : l’appli vérifie que le compte tombe juste et tient les totaux. Quand les sept contrats ont été joués, celui qui a le meilleur total, c’est-à-dire le moins de pénalités, gagne la partie.',
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: "Enchaîner sept manches, chacune avec son contrat. Presque tout coûte des points de pénalité : le gagnant est celui dont le total est le plus élevé, c'est-à-dire celui qui a le moins ramassé.",
    },
    {
      title: 'Distribution',
      body: "3 à 6 joueurs, 52 cartes, tout le paquet distribué. À 3, 5 ou 6 joueurs le compte ne tombe pas juste : on retire 1, 2 ou 4 petites cartes noires ou carreau. Jamais un cœur ni une dame, sinon les contrats perdent leur valeur.",
    },
    {
      title: 'Les plis',
      body: "On doit fournir la couleur demandée si on en a une, sans obligation de monter ; sinon on se défausse librement. Il n'y a pas d'atout. La plus forte carte de la couleur demandée remporte le pli.",
    },
    {
      title: 'Les cinq contrats négatifs',
      body: "Les plis : −10 par pli. Les cœurs : −10 par cœur (−130 en tout). Les dames : −20 chacune (−80 en tout). Le Barbu : −50 pour le roi de cœur. Les derniers plis : −50 pour le dernier, −30 pour l'avant-dernier.",
    },
    {
      title: 'La salade',
      body: "Les cinq contrats précédents comptés en une seule manche : plis, cœurs, dames, Barbu et derniers plis se cumulent. C'est la manche décisive.",
    },
    {
      title: 'La réussite',
      body: "Pas de plis : on pose ses cartes pour former des suites au centre, et on cherche à vider sa main. +100 au premier, +50 au deuxième. C'est le seul contrat qui rapporte.",
    },
    {
      title: 'Les barèmes varient',
      body: "Le Barbu se transmet de bouche à oreille et les points changent d'une famille à l'autre : le roi de cœur vaut −50 ou −80, certaines tables ne comptent que le dernier pli, et la réussite se joue en +100/+50 ou en +45/+20/+10 avec −10 au dernier. Ces trois écarts sont réglables au moment de créer la partie.",
    },
  ],
};
