// Définition du jeu « Mölkky ».
//
// Le seul jeu de l'appli où une « manche » est un unique lancer : on tape le
// résultat, la main passe au suivant. Trois règles font tout le sel du compte,
// et aucune n'est une simple addition :
//  - une quille seule vaut son numéro, plusieurs quilles valent leur nombre ;
//  - dépasser 50 fait retomber à 25, exactement ;
//  - trois lancers nuls d'affilée éliminent.
//
// Règles vérifiées auprès de la Fédération Française de Mölkky (ff-molkky.fr)
// et de molkky.world pour la disposition et la distance.

import { nomDe } from './common.js';

/** Ce qu'un lancer peut rapporter : 0 (raté) à 12. */
export const LANCERS = Array.from({ length: 13 }, (_, n) => n);

const CIBLE = 50;
const RETOUR = 25;
const ECHECS_ELIMINATOIRES = 3;

/**
 * État de chaque joueur après les lancers donnés.
 * Tout se déduit de l'historique : total, série de ratés en cours, élimination.
 * @returns {Map<string, {total:number, echecs:number, elimine:boolean, gagne:boolean}>}
 */
export function etats(rounds = [], players = []) {
  const out = new Map(players.map((p) => [p.id, { total: 0, echecs: 0, elimine: false, gagne: false }]));
  for (const round of rounds) {
    const id = round.raw?.joueur;
    const etat = out.get(id);
    if (!etat) continue;
    etat.total += Number(round.scores?.[id]) || 0;
    // Un lancer nul allonge la série ; n'importe quel point la remet à zéro.
    etat.echecs = (Number(round.raw?.points) || 0) === 0 ? etat.echecs + 1 : 0;
    if (etat.echecs >= ECHECS_ELIMINATOIRES) etat.elimine = true;
    if (etat.total >= CIBLE) etat.gagne = true;
  }
  return out;
}

/** Joueurs encore en lice : ni éliminés, ni déjà à 50. */
export function enLice(rounds, players) {
  const e = etats(rounds, players);
  return players.filter((p) => !e.get(p.id).elimine && !e.get(p.id).gagne);
}

/**
 * À qui le tour ? On repart du dernier lanceur et on avance dans l'ordre de la
 * table, en sautant ceux qui ne lancent plus.
 */
export function prochainLanceur(rounds = [], players = []) {
  const restants = enLice(rounds, players);
  if (restants.length === 0) return null;

  const dernier = [...rounds].reverse().find((r) => players.some((p) => p.id === r.raw?.joueur));
  if (!dernier) return restants[0].id;

  const depart = players.findIndex((p) => p.id === dernier.raw.joueur);
  for (let i = 1; i <= players.length; i += 1) {
    const candidat = players[(depart + i) % players.length];
    if (restants.some((p) => p.id === candidat.id)) return candidat.id;
  }
  return restants[0].id;
}

/**
 * Ce que rapporte réellement un lancer, compte tenu du total déjà acquis.
 * Au-delà de 50 on ne dépasse pas : on redescend à 25.
 */
export function effetDuLancer(total, points) {
  const vise = total + points;
  if (vise > CIBLE) return { total: RETOUR, delta: RETOUR - total, depassement: true, gagne: false };
  return { total: vise, delta: points, depassement: false, gagne: vise === CIBLE };
}

export default {
  id: 'molkky',
  name: 'Mölkky',
  tagline: 'Cinquante pile, ni plus ni moins',
  minPlayers: 2,
  maxPlayers: 8,
  lowestWins: false,
  roundTotal: null,
  allowsNegative: false,
  supportsTokens: false,
  entry: 'form',
  // Une « manche » est ici un seul lancer : le mot change tout l'habillage.
  roundLabel: 'Lancer',
  roundLabelGender: 'm',
  // Un lancer par ligne : le tableau aurait quarante colonnes. On n'affiche
  // que les totaux, et l'état de chacun à côté de son nom.
  compactBoard: true,
  // Le score d'un lancer dépend de ceux d'avant : après une correction, il
  // faut rejouer la partie plutôt que garder des calculs périmés.
  replays: true,
  defaultTarget: CIBLE,
  targetChoices: [CIBLE],

  deal() {
    return { quilles: 12, distance: '3,50 m', perPlayer: 1 };
  },

  form(playerCount, players, rounds = []) {
    const e = etats(rounds, players);
    return [
      {
        key: 'joueur',
        type: 'player',
        label: 'Qui lance ?',
        hint: 'Le tour suivant est proposé tout seul : normalement, vous n’avez rien à changer ici.',
      },
      {
        key: 'points',
        type: 'choice',
        label: 'Ce que le lancer a fait tomber',
        hint: 'Une seule quille : son numéro. Plusieurs quilles : leur nombre. Rien : 0.',
        options: LANCERS.map((n) => ({ value: n, label: n === 0 ? 'Raté' : String(n) })),
      },
    ].concat(
      // Rappel discret de ceux qui ne lancent plus, pour ne pas les chercher.
      players.some((p) => e.get(p.id).elimine)
        ? [{
          key: '_elimines',
          type: 'note',
          label: 'Hors jeu',
          hint: players.filter((p) => e.get(p.id).elimine).map((p) => p.name).join(', ')
            + ' : trois lancers nuls d’affilée.',
        }]
        : [],
    );
  },

  formDefaults(players, rounds = []) {
    return { joueur: prochainLanceur(rounds, players), points: null };
  },

  /** Le journal des lancers : « 12. Alice » / « 8 points, elle passe à 34 ». */
  roundLine(round, index, match) {
    const players = match?.players ?? [];
    const id = round.raw?.joueur;
    const nom = nomDe(players, id);
    const points = Number(round.raw?.points) || 0;
    const delta = Number(round.scores?.[id]) || 0;
    const cumul = match?.rounds
      ?.slice(0, index + 1)
      .reduce((t, r) => t + (Number(r.scores?.[id]) || 0), 0);

    const fait = points === 0 ? 'lancer nul' : `${points} point${points > 1 ? 's' : ''}`;
    const chute = delta < 0 ? ' — dépassement, retour à 25' : '';
    return { title: `${index + 1}. ${nom}`, detail: `${fait}${chute} · total ${cumul}` };
  },

  /** Un badge à côté du nom : c'est là que se lit l'état de la partie. */
  playerStatus(player, match) {
    const e = etats(match.rounds, match.players).get(player.id);
    if (!e) return null;
    if (e.gagne) return { text: '50 — gagné', tone: 'ok' };
    if (e.elimine) return { text: 'éliminé', tone: 'danger' };
    if (e.echecs > 0) return { text: `${e.echecs} raté${e.echecs > 1 ? 's' : ''}`, tone: 'warn' };
    return null;
  },

  /** La partie s'arrête aussi quand il ne reste qu'un joueur debout. */
  finished(match) {
    const e = etats(match.rounds, match.players);
    if (match.players.some((p) => e.get(p.id).gagne)) return true;
    return match.players.filter((p) => !e.get(p.id).elimine).length <= 1;
  },

  validateRound(form, players, ctx) {
    const id = form?.joueur;
    if (!id) return { ok: false, level: 'warn', message: 'Indiquez qui vient de lancer.' };
    if (form.points == null || form.points === '') {
      return { ok: false, level: 'warn', message: `À ${nomDe(players, id)} de jouer : que sont devenues les quilles ?` };
    }

    const e = etats(ctx?.rounds ?? [], players).get(id);
    if (e?.elimine) {
      return { ok: false, level: 'warn', message: `${nomDe(players, id)} est éliminé : il ne lance plus.` };
    }
    if (e?.gagne) {
      return { ok: false, level: 'warn', message: `${nomDe(players, id)} a déjà atteint 50.` };
    }

    const points = Number(form.points) || 0;
    const suite = effetDuLancer(e?.total ?? 0, points);
    const nom = nomDe(players, id);

    if (suite.gagne) return { ok: true, level: 'ok', message: `${nom} tombe pile sur 50 : partie gagnée.` };
    if (suite.depassement) {
      return {
        ok: true,
        level: 'ok',
        message: `${e.total} + ${points} dépasserait 50 : ${nom} redescend à 25.`,
      };
    }
    if (points === 0) {
      const serie = (e?.echecs ?? 0) + 1;
      return {
        ok: true,
        level: 'ok',
        message: serie >= ECHECS_ELIMINATOIRES
          ? `Troisième lancer nul : ${nom} est éliminé.`
          : `Lancer nul — ${serie}e d'affilée pour ${nom}. Au troisième, il est éliminé.`,
      };
    }
    return { ok: true, level: 'ok', message: `${nom} passe de ${e.total} à ${suite.total}.` };
  },

  /**
   * Un lancer ne rapporte qu'à son auteur. Aucune note : ce qu'il faut savoir
   * est déjà dit au bon endroit — l'avertissement avant de valider, la
   * pastille dans le tableau, et le journal des lancers ensuite. Le répéter
   * ici le ferait apparaître deux fois dans le bandeau de saisie.
   */
  finalize(form, ctx, players) {
    const scores = Object.fromEntries(players.map((p) => [p.id, 0]));
    const id = form?.joueur;
    if (!id || !(id in scores)) return { scores, notes: [] };

    const e = etats(ctx?.rounds ?? [], players).get(id);
    scores[id] = effetDuLancer(e.total, Number(form.points) || 0).delta;
    return { scores, notes: [] };
  },

  pitch: "Le Mölkky, c'est douze quilles numérotées, un bâton, et une seule chose à faire : arriver à cinquante points. Une quille tombée toute seule vaut son numéro, plusieurs quilles valent leur nombre — alors viser gros n'est pas toujours malin. Et surtout, il faut tomber pile : dépasser cinquante vous renvoie à vingt-cinq. Trois lancers dans le vide et vous êtes éliminé. Ça se joue debout, dehors, et ça dure vingt minutes.",

  setup(playerCount = 4) {
    const n = Math.min(Math.max(playerCount, this.minPlayers), this.maxPlayers);
    return [
      {
        title: 'Le matériel',
        say: 'Sortez les douze quilles numérotées de un à douze, et le bâton de lancer : c’est lui qu’on appelle le mölkky. Il vous faut un terrain plat, herbe ou gravier, et de la place devant vous.',
      },
      {
        title: 'Poser les quilles',
        say: 'Serrez les douze quilles les unes contre les autres, en quatre rangées. Devant, face aux lanceurs : le un et le deux. Derrière : le trois, le dix, le quatre. Puis le cinq, le onze, le douze, le six. Et au fond : le sept, le neuf, le huit. Les gros numéros sont au centre, c’est fait exprès.',
      },
      {
        title: 'Le repère de lancer',
        say: 'Reculez de trois mètres cinquante et posez le mölkkaari, c’est-à-dire la marque de lancer : un bâton, une corde, ce que vous voulez. On ne la franchit pas en lançant, on la contourne comme un muret, sinon le lancer ne compte pas.',
        },
      {
        title: 'L’ordre de jeu',
        say: `Mettez-vous d'accord sur l'ordre des ${n} joueurs, puis n'en changez plus : chacun lance à son tour, toujours dans le même sens.`,
      },
      {
        title: 'Compter un lancer',
        say: 'C’est là que le jeu se joue. Si une seule quille est tombée, vous marquez son numéro : la quille sept toute seule vaut sept points. Si plusieurs quilles sont tombées, vous marquez leur nombre, pas leurs numéros : trois quilles au sol valent trois points. Une quille ne compte que si elle est complètement couchée.',
      },
      {
        title: 'Relever les quilles',
        say: 'Après chaque lancer, on relève les quilles tombées à l’endroit exact où elles se sont arrêtées, sans les déplacer, le numéro tourné vers les lanceurs. Les quilles s’éparpillent donc petit à petit, et le jeu devient de plus en plus difficile.',
      },
      {
        title: 'Tomber pile sur cinquante',
        say: 'Le but est de marquer exactement cinquante points. Si un lancer vous ferait dépasser, vous ne dépassez pas : votre score redescend à vingt-cinq, et tout est à refaire. C’est la règle qui fait perdre les parties gagnées.',
      },
      {
        title: 'Les lancers nuls',
        say: 'Un lancer qui ne couche aucune quille est un lancer nul. Trois lancers nuls d’affilée et vous êtes éliminé de la manche. Marquer un seul point remet le compteur à zéro.',
      },
      {
        title: 'Compter ici',
        say: 'À chaque lancer, tapez simplement ce qui est tombé : l’appli sait qui doit lancer, applique le retour à vingt-cinq, compte les lancers nuls et vous prévient avant l’élimination. Le premier à cinquante gagne.',
      },
    ];
  },

  rules: [
    {
      title: 'But du jeu',
      body: "Marquer exactement 50 points. Le premier qui y arrive gagne. Dépasser 50 fait redescendre à 25 : il faut tomber pile.",
    },
    {
      title: 'Compter les points',
      body: "Une seule quille tombée : on marque son numéro (la quille 12 seule vaut 12). Plusieurs quilles tombées : on marque leur nombre, pas leurs numéros (5 quilles au sol valent 5). Une quille ne compte que si elle est entièrement couchée.",
    },
    {
      title: 'Les lancers nuls',
      body: "Un lancer qui ne couche aucune quille est nul. Trois lancers nuls consécutifs éliminent le joueur. Le moindre point remet la série à zéro.",
    },
    {
      title: 'Mise en place',
      body: "12 quilles serrées en quatre rangées, du plus proche au plus loin : 1-2, puis 3-10-4, puis 5-11-12-6, puis 7-9-8. La marque de lancer, le mölkkaari, se pose à 3,50 m des quilles.",
    },
    {
      title: 'Lancer',
      body: "On lance le mölkky par en dessous, sans franchir le mölkkaari — on le contourne comme un muret, sous peine d'annulation du lancer.",
    },
    {
      title: 'Relever les quilles',
      body: "Après chaque lancer, les quilles tombées se relèvent à l'endroit exact où elles se sont arrêtées, sans être soulevées, le numéro tourné vers la zone de lancer. La formation se disperse au fil de la partie.",
    },
  ],
};
