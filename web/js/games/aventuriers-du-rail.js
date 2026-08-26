// Définition du jeu « Les Aventuriers du Rail ».
//
// Le décompte final n'est pas difficile, il est long : chacun retourne ses
// cartes Destination, additionne ses routes une par une, et quelqu'un finit
// toujours par recompter. Ce que l'appli prend en charge, c'est la conversion
// des longueurs de route en points — le barème n'est pas linéaire, une route
// de 6 vaut quinze fois plus qu'une de 1 — et les bonus propres à chaque boîte.
//
// Trois éditions, trois décomptes réellement différents :
//  - États-Unis : routes de 1 à 6, bonus de 10 au plus long chemin ;
//  - Europe : routes de 1 à 8 (ni 5 ni 7), même bonus, et 4 points par gare
//    non utilisée ;
//  - Autour du Monde : routes de 1 à 8, des ports qui rapportent gros, et
//    aucun bonus de fin de partie — la règle le dit explicitement.
//
// Barèmes vérifiés sur la règle officielle Days of Wonder d'Autour du Monde
// et sur regledujeu.fr pour les éditions États-Unis et Europe.

import { lireLigne, grillesVides } from './common.js';

/**
 * Points d'une route selon sa longueur. Le barème est commun aux trois
 * éditions ; seules changent les longueurs qui existent sur la carte.
 */
export const POINTS_ROUTE = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15, 7: 18, 8: 21 };

/** Ce qui distingue une boîte d'une autre. */
export const EDITIONS = {
  usa: {
    label: 'États-Unis',
    longueurs: [1, 2, 3, 4, 5, 6],
    wagons: 45,
    plusLong: 10,
    gares: 0,
    ports: false,
    // « Si plusieurs joueurs sont à égalité pour la victoire, celui parmi eux
    // qui a réalisé le plus de tickets l'emporte. Si l'égalité persiste, c'est
    // le joueur parmi les ex-æquo qui détient la carte bonus "chemin le plus
    // long" s'il y en a un qui gagne. Dans le cas contraire, ces joueurs
    // partagent la victoire. » (livret Days of Wonder, éd. française 2025)
    departage: true,
  },
  europe: {
    label: 'Europe',
    longueurs: [1, 2, 3, 4, 6, 8],
    wagons: 45,
    plusLong: 10,
    // Une gare laissée dans sa réserve rapporte 4 points.
    gares: 4,
    ports: false,
    // « En cas d'égalité entre plusieurs joueurs, le joueur qui a complété le
    // plus de cartes Destination remporte la victoire. En cas d'égalité
    // répétée, celui qui a construit le moins de Gares est déclaré vainqueur.
    // Dans le cas peu probable où il y aurait encore égalité, le joueur qui a
    // le chemin le plus long gagne. » (livret Europe)
    departage: true,
  },
  monde: {
    label: 'Autour du Monde',
    longueurs: [1, 2, 3, 4, 5, 6, 7, 8],
    wagons: 60,
    // « Il n'y a aucun bonus de fin de partie dans cette version. »
    plusLong: 0,
    gares: 0,
    ports: true,
    // « Le joueur qui a le plus de points l'emporte » — et rien de plus : ce
    // livret-là ne prévoit aucun départage.
    departage: false,
  },
};

/** Ce que rapporte un port selon le nombre de destinations réussies qu'il sert. */
export const POINTS_PORT = { un: 20, deux: 30, trois: 40 };
const MALUS_PORT = -4;
const NB_PORTS = 3;
const NB_GARES = 3;

/** Les grilles de saisie possibles, toutes éditions confondues. */
const GRILLES = ['routes', 'destinations', 'gares', 'ports'];

export function edition(options) {
  return EDITIONS[options?.edition] ?? EDITIONS.usa;
}

/** Décompte complet d'un joueur, poste par poste. */
export function decompteRail(form, playerId, options) {
  const ed = edition(options);
  const r = lireLigne(form, 'routes', playerId);
  const d = lireLigne(form, 'destinations', playerId);
  const g = lireLigne(form, 'gares', playerId);
  const p = lireLigne(form, 'ports', playerId);

  // Le cœur du calcul : chaque longueur de route a son prix.
  const routes = ed.longueurs.reduce((total, n) => total + r(`r${n}`) * POINTS_ROUTE[n], 0);
  const reussies = d('reussies');
  const ratees = d('ratees');
  const gares = ed.gares ? g('restantes') * ed.gares : 0;
  const ports = ed.ports
    ? p('un') * POINTS_PORT.un + p('deux') * POINTS_PORT.deux + p('trois') * POINTS_PORT.trois
      + p('manquants') * MALUS_PORT
    : 0;

  const plusLong = ed.plusLong && (form?.plusLong ?? []).includes(playerId) ? ed.plusLong : 0;

  return {
    routes,
    reussies,
    ratees,
    gares,
    ports,
    plusLong,
    total: routes + reussies - ratees + gares + ports + plusLong,
  };
}

export default {
  id: 'aventuriers-du-rail',
  name: 'Les Aventuriers du Rail',
  tagline: 'Le décompte des routes, fait pour vous',
  /** Vignette du jeu : dessin original, voir `art` dans le README. */
  art: {
    teinte: '#60a5fa',
    // Trois wagons posés bout à bout : une route prise sur la carte, ce qu'on
    // passe la partie à faire. Une locomotive se confondrait avec un camion.
    svg: `<g transform="rotate(-14 16 16)">
            <path d="M2.5 12.5h7.4l1.6 3.5-1.6 3.5H2.5L4 16z" opacity=".55"/>
            <path d="M12.3 12.5h7.4l1.6 3.5-1.6 3.5h-7.4l1.5-3.5z"/>
            <path d="M22.1 12.5h7.4L31 16l-1.5 3.5h-7.4l1.6-3.5z" opacity=".55"/>
          </g>`,
  },
  minPlayers: 2,
  maxPlayers: 5,
  lowestWins: false,
  roundTotal: null,
  allowsNegative: false,
  supportsTokens: false,
  entry: 'form',
  // Comme au 7 Wonders : une « manche » est une partie entière, le score se
  // compte une fois à la fin.
  roundLabel: 'Partie',
  endMode: 'rounds',
  defaultTarget: 1,
  targetChoices: [1, 2, 3],

  options: [
    {
      key: 'edition',
      label: 'Quelle boîte ?',
      hint: 'Le barème des routes et les bonus ne sont pas les mêmes d’une édition à l’autre.',
      options: [
        { value: 'usa', label: 'États-Unis' },
        { value: 'europe', label: 'Europe' },
        { value: 'monde', label: 'Autour du Monde' },
      ],
    },
  ],

  deal(playerCount, options) {
    const ed = edition(options);
    return { perPlayer: ed.wagons, wagons: ed.wagons, edition: ed.label };
  },

  form(playerCount, players, rounds = [], form = {}, options = {}) {
    const ed = edition(options);

    const champs = [
      {
        key: 'routes',
        type: 'players',
        label: 'Routes construites',
        hint: 'Combien de routes de chaque longueur — pas les points : l’appli applique le barème.',
        columns: ed.longueurs.map((n) => ({
          key: `r${n}`,
          label: `${n} → ${POINTS_ROUTE[n]}`,
          min: 0,
          max: 45,
          placeholder: '0',
        })),
      },
      {
        key: 'destinations',
        type: 'players',
        label: 'Cartes Destination',
        hint: 'Les points inscrits sur les cartes : ceux des réussies s’ajoutent, ceux des ratées se retranchent.',
        columns: [
          { key: 'reussies', label: 'Réussies', min: 0, max: 300, placeholder: '0' },
          { key: 'ratees', label: 'Ratées', min: 0, max: 300, placeholder: '0' },
        ],
      },
    ];

    if (ed.gares) {
      champs.push({
        key: 'gares',
        type: 'players',
        label: 'Gares non utilisées',
        hint: `Chaque gare restée dans la réserve rapporte ${ed.gares} points. Il y en a ${NB_GARES} par joueur.`,
        columns: [{ key: 'restantes', label: 'Gares', min: 0, max: NB_GARES, placeholder: '0' }],
      });
    }

    if (ed.ports) {
      champs.push({
        key: 'ports',
        type: 'players',
        label: 'Ports',
        hint: `Combien de vos ports servent 1, 2, ou 3 destinations réussies et plus. Chacun des ${NB_PORTS} ports non construits coûte 4 points.`,
        columns: [
          { key: 'un', label: '1 → 20', min: 0, max: NB_PORTS, placeholder: '0' },
          { key: 'deux', label: '2 → 30', min: 0, max: NB_PORTS, placeholder: '0' },
          { key: 'trois', label: '3+ → 40', min: 0, max: NB_PORTS, placeholder: '0' },
          { key: 'manquants', label: 'Non bâtis', min: 0, max: NB_PORTS, placeholder: '0' },
        ],
      });
    }

    if (ed.plusLong) {
      champs.push({
        key: 'plusLong',
        type: 'player',
        // À égalité, le bonus revient à chacun des ex æquo.
        multiple: true,
        label: `Plus long chemin continu (+${ed.plusLong})`,
        hint: 'Touchez le ou les joueurs concernés — en cas d’égalité, chacun marque le bonus.',
      });
    }

    return champs;
  },

  formDefaults() {
    return { plusLong: [] };
  },

  /**
   * Ce qu'il faut demander à la table pour départager, faute de l'avoir déjà.
   *
   * Le livret départage d'abord par le NOMBRE de cartes Destination réussies.
   * Le décompte, lui, ne retient que leurs POINTS — deux cartes à 5 valent
   * autant qu'une à 10 sans dire combien elles sont. Il faut donc les compter,
   * mais seulement le jour où l'égalité survient : les compter à chaque partie
   * serait une saisie de plus pour un cas rare.
   */
  tieBreakAsk(match) {
    if (!edition(match?.options).departage) return null;
    return {
      label: 'Cartes Destination réussies',
      hint: 'Le livret départage d’abord par leur nombre — et non par leurs points, seuls retenus dans le décompte.',
      min: 0,
      max: 30,
    };
  },

  /** Le départage du livret, dans son ordre, édition par édition. */
  tieBreak(a, b, match) {
    const ed = edition(match?.options);
    if (!ed.departage) return 0;

    // 1. Le plus de cartes Destination réussies. Tant que la table n'a pas
    //    répondu, on s'arrête là : passer au critère suivant appliquerait le
    //    livret dans le désordre, et pourrait désigner l'autre joueur.
    const reussies = (p) => Number(match?.tieData?.[p.id]);
    if (!Number.isFinite(reussies(a)) || !Number.isFinite(reussies(b))) return 0;
    const ecartDestinations = reussies(b) - reussies(a);
    if (ecartDestinations !== 0) return ecartDestinations;

    // 2. Europe seulement : le moins de gares construites, ce qui revient au
    //    plus de gares restées en réserve — c'est ce que l'appli enregistre.
    if (ed.gares) {
      const restantes = (p) => (match.rounds ?? []).reduce(
        (total, r) => total + (Number(r.raw?.gares?.[p.id]?.restantes) || 0),
        0,
      );
      const ecart = restantes(b) - restantes(a);
      if (ecart !== 0) return ecart;
    }

    // 3. Le chemin le plus long. Aux États-Unis c'est le second critère, en
    //    Europe le troisième ; dans les deux cas il vient en dernier ici.
    const bonus = (p) => ((match.rounds ?? []).some(
      (r) => (r.raw?.plusLong ?? []).includes(p.id),
    ) ? 1 : 0);
    return bonus(b) - bonus(a);
  },

  /** Ce que le livret prescrit, dit à la table quand l'égalité subsiste. */
  tieNote(match) {
    const ed = edition(match?.options);
    if (!ed.departage) {
      return 'Le livret d’Autour du Monde ne prévoit aucun départage : « le joueur qui a le plus de points l’emporte », et rien de plus.';
    }
    return ed.gares
      ? 'Livret Europe : le plus de cartes Destination réussies, puis le moins de gares construites, puis le chemin le plus long.'
      : 'Livret États-Unis : le plus de tickets réalisés, puis la carte « chemin le plus long ». À défaut, ces joueurs partagent la victoire.';
  },

  validateRound(form, players, ctx) {
    const ed = edition(ctx?.options);
    const manquants = players.filter((p) => grillesVides(form, GRILLES, p.id));
    if (manquants.length === players.length) {
      return { ok: false, level: 'warn', message: 'Saisissez le décompte de chaque joueur.' };
    }

    // Garde-fou sur les postes dont le total est borné par le matériel.
    for (const p of players) {
      if (ed.ports) {
        const q = lireLigne(form, 'ports', p.id);
        const total = q('un') + q('deux') + q('trois') + q('manquants');
        if (total > NB_PORTS) {
          return {
            ok: false,
            level: 'warn',
            message: `${p.name} a ${total} ports : chaque joueur n’en a que ${NB_PORTS}.`,
          };
        }
      }
      if (ed.gares && lireLigne(form, 'gares', p.id)('restantes') > NB_GARES) {
        return {
          ok: false,
          level: 'warn',
          message: `${p.name} ne peut pas avoir plus de ${NB_GARES} gares en réserve.`,
        };
      }
    }

    const classement = players
      .filter((p) => !manquants.includes(p))
      .map((p) => ({ nom: p.name, total: decompteRail(form, p.id, ctx?.options).total }))
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
    const ed = edition(ctx?.options);
    const scores = {};
    const details = {};
    for (const p of players) {
      const d = decompteRail(form, p.id, ctx?.options);
      scores[p.id] = d.total;
      details[p.id] = d;
    }

    const notes = [];
    const classement = [...players].sort((a, b) => scores[b.id] - scores[a.id]);
    const tete = classement[0];

    // Le poste que personne ne recompte volontiers : on montre la conversion.
    const batisseur = players.reduce(
      (a, p) => (details[p.id].routes > details[a.id].routes ? p : a),
      players[0],
    );
    const detail = ed.longueurs
      .map((n) => ({ n, combien: Number(form?.routes?.[batisseur.id]?.[`r${n}`]) || 0 }))
      .filter((x) => x.combien > 0)
      .map((x) => `${x.combien}×${POINTS_ROUTE[x.n]}`)
      .join(' + ');
    if (detail) {
      notes.push(`Routes de ${batisseur.name} : ${detail} = ${details[batisseur.id].routes}.`);
    }

    const exaequo = classement.filter((p) => scores[p.id] === scores[tete.id]);
    if (exaequo.length > 1) {
      // La règle départage au nombre de destinations réussies, que l'appli ne
      // compte pas : on le dit plutôt que de trancher à tort.
      notes.push(
        `${exaequo.map((p) => p.name).join(' et ')} à ${scores[tete.id]} :`
        + ' départagez au nombre de cartes Destination réussies.',
      );
    } else {
      notes.push(`${tete.name} l'emporte avec ${scores[tete.id]} points.`);
    }

    return { scores, notes };
  },

  pitch: "Les Aventuriers du Rail, c'est une carte, des wagons de couleur, et des villes à relier. À votre tour, vous faites une seule chose : piocher des cartes, ou dépenser celles que vous avez pour vous emparer d'une route. Chaque route rapporte des points tout de suite, et d'autant plus qu'elle est longue. Mais l'essentiel se joue en secret : vos cartes Destination vous demandent de relier deux villes, et si vous n'y arrivez pas à la fin, elles vous coûtent exactement ce qu'elles auraient dû vous rapporter.",

  setup(playerCount = 4, options = {}) {
    const ed = edition(options);
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);

    if (ed === EDITIONS.monde) {
      return [
        {
          title: 'Le plateau',
          say: 'Posez le plateau du monde au milieu de la table. Cette édition se joue avec des trains et des bateaux : les routes terrestres se prennent avec des wagons, les routes maritimes avec des bateaux.',
        },
        {
          title: 'Les cartes',
          say: 'Mélangez séparément les cartes Wagon, au dos beige, et les cartes Bateau, au dos bleu. Donnez à chacun trois cartes Wagon et sept cartes Bateau, puis retournez trois cartes de chaque paquet face visible au milieu.',
        },
        {
          title: 'Les destinations',
          say: 'Distribuez cinq cartes Destination à chaque joueur. Chacun doit en garder au moins trois ; les autres retournent sous la pioche.',
        },
        {
          title: 'Répartir ses pions',
          say: `Chaque joueur reçoit soixante-quinze pions de sa couleur : vingt-cinq wagons et cinquante bateaux. Mais vous ne pouvez en garder que soixante. Décidez en secret de votre répartition, puis révélez tous en même temps. Pour une première partie, vingt wagons et quarante bateaux sont un bon choix. Vous ne pouvez jamais dépasser vingt-cinq wagons ni cinquante bateaux.`,
        },
        {
          title: 'Les ports',
          say: 'Donnez enfin trois ports à chaque joueur. On les construira plus tard, dans les villes marquées d’une ancre.',
        },
        {
          title: 'Un tour de jeu',
          say: 'À votre tour, vous faites une seule action : prendre deux cartes Transport, prendre possession d’une route, piocher de nouvelles destinations, construire un port, ou échanger des pions contre d’autres — mais chaque pion échangé coûte un point.',
        },
        {
          title: 'Ce que rapporte un port',
          say: 'Un port se construit dans une ville où vous êtes déjà arrivé, contre deux cartes Wagon et deux cartes Bateau de la même couleur, marquées du symbole de port. À la fin, il vaut vingt points si sa ville figure sur une de vos destinations réussies, trente points si elle en sert deux, et quarante à partir de trois. Attention : chaque port que vous n’aurez pas construit vous coûtera quatre points.',
        },
        {
          title: 'La fin de la partie',
          say: `Quand un joueur n'a plus que six pions ou moins, wagons et bateaux confondus, tout le monde joue encore deux tours, puis on compte. Dans cette édition, il n'y a aucun bonus de fin de partie : ni plus long chemin, ni rien d'autre.`,
        },
        {
          title: 'Compter ici',
          say: 'Saisissez pour chacun le nombre de routes de chaque longueur, les points de ses destinations réussies et ratées, et l’état de ses ports. L’appli applique le barème, les vingt, trente ou quarante points des ports, et les quatre points perdus par port non construit.',
        },
      ];
    }

    const enEurope = ed === EDITIONS.europe;
    return [
      {
        title: 'Le plateau',
        say: enEurope
          ? 'Posez le plateau de l’Europe au milieu de la table, et le compteur de score sur son pourtour.'
          : 'Posez le plateau des États-Unis au milieu de la table, et le compteur de score sur son pourtour.',
      },
      {
        title: 'Les wagons',
        say: `Chaque joueur choisit une couleur et prend ses ${ed.wagons} wagons, plus le marqueur de score de la même couleur, qu'il place sur la case départ. À ${n} joueurs, rangez les couleurs qui restent.`,
      },
      enEurope
        ? {
          title: 'Les gares',
          say: 'Chaque joueur reçoit aussi trois gares. Une gare posée vous permet d’emprunter une route d’un adversaire, mais attention : chaque gare que vous gardez en réserve vaut quatre points à la fin. Les poser coûte donc cher.',
        }
        : {
          title: 'Les cartes Wagon',
          say: 'Mélangez les cartes Wagon et donnez-en quatre à chaque joueur. Retournez ensuite cinq cartes face visible à côté de la pioche : ce sont celles que l’on pourra choisir à vue.',
        },
      enEurope
        ? {
          title: 'Les cartes Wagon',
          say: 'Mélangez les cartes Wagon et donnez-en quatre à chaque joueur. Retournez ensuite cinq cartes face visible à côté de la pioche.',
        }
        : {
          title: 'Les destinations',
          say: 'Mélangez les cartes Destination et donnez-en trois à chaque joueur. Regardez-les sans les montrer : vous devez en garder au moins deux, et rendre celles dont vous ne voulez pas sous la pioche.',
        },
      enEurope
        ? {
          title: 'Les destinations',
          say: 'Séparez les cartes Destination longues, au dos différent, des cartes ordinaires. Donnez à chacun une destination longue et trois ordinaires. Chacun doit en garder au moins deux au total, et rendre le reste sous la pioche.',
        }
        : {
          title: 'Un tour de jeu',
          say: 'À votre tour, vous faites une seule action : prendre deux cartes Wagon, prendre possession d’une route, ou piocher trois nouvelles cartes Destination dont vous garderez au moins une.',
        },
      {
        title: 'Prendre une route',
        say: 'Pour prendre une route, posez autant de cartes de la couleur de la route qu’elle compte de cases, puis alignez vos wagons dessus. Vous marquez les points immédiatement : une case vaut un point, deux en valent deux, trois en valent quatre, quatre en valent sept.',
      },
      {
        title: 'Les longues routes',
        say: enEurope
          ? 'Ensuite, ça grimpe vite : une route de six cases vaut quinze points, et une de huit en vaut vingt et un. Ce sont elles qui font les gros scores — et sur cette carte, les tunnels et les ferries demandent des cartes en plus.'
          : 'Ensuite, ça grimpe vite : une route de cinq cases vaut dix points, et une de six en vaut quinze. Ce sont elles qui font les gros scores.',
      },
      {
        title: 'La fin de la partie',
        say: `Quand un joueur n'a plus que deux wagons ou moins, chacun joue encore un tour, puis la partie s'arrête. On révèle alors ses destinations : les réussies rapportent, les ratées coûtent le même nombre de points. Et dix points de bonus reviennent à celui qui a le plus long chemin continu — à égalité, chacun d'eux les marque.`,
      },
      {
        title: 'Compter ici',
        say: `Saisissez pour chacun le nombre de routes de chaque longueur, sans faire le calcul : l'appli applique le barème. Ajoutez les points des destinations réussies et ratées${enEurope ? ', les gares restées en réserve' : ''}, et désignez le plus long chemin.`,
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: "Relier des villes pour marquer le plus de points. Les routes rapportent au moment où on les prend ; les cartes Destination se révèlent à la fin, et coûtent leurs points si elles ne sont pas réussies. Le plus grand total gagne.",
    },
    {
      title: 'Le barème des routes',
      body: "Il n'est pas linéaire, c'est tout l'intérêt : 1 case = 1 point, 2 = 2, 3 = 4, 4 = 7, 5 = 10, 6 = 15, 7 = 18, 8 = 21. Une route de 6 rapporte donc quinze fois plus qu'une route de 1.",
    },
    {
      title: 'Un tour de jeu',
      body: "Une seule action par tour : prendre deux cartes Transport, prendre possession d'une route en dépensant autant de cartes de sa couleur qu'elle compte de cases, ou piocher de nouvelles cartes Destination dont il faut garder au moins une.",
    },
    {
      title: 'Édition États-Unis',
      body: "2 à 5 joueurs, 45 wagons chacun, routes de 1 à 6 cases. Bonus de 10 points au joueur ayant le plus long chemin continu ; à égalité, chacun des ex æquo le marque.",
    },
    {
      title: 'Édition Europe',
      body: "45 wagons chacun, routes de 1 à 8 cases (il n'y a ni 5 ni 7). Même bonus de 10 points au plus long chemin. Chaque joueur reçoit 3 gares : une gare permet d'emprunter une route adverse, mais chaque gare non utilisée rapporte 4 points à la fin. La carte ajoute aussi les tunnels et les ferries.",
    },
    {
      title: 'Édition Autour du Monde',
      body: "Trains et bateaux, routes de 1 à 8 cases. Chaque joueur répartit 60 pions entre wagons (25 au maximum) et bateaux (50 au maximum). Les 3 ports rapportent 20, 30 ou 40 points selon qu'ils servent 1, 2, ou 3 destinations réussies et plus — et chaque port non construit coûte 4 points. **Cette édition n'a aucun bonus de fin de partie** : pas de plus long chemin.",
    },
    {
      title: 'Les égalités',
      body: "En cas d'égalité au score, la règle départage au nombre de cartes Destination réussies, puis au plus long chemin. L'appli ne compte pas les cartes une par une : elle signale l'égalité et vous laisse trancher.",
    },
  ],
};
