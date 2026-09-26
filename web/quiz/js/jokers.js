// Les jokers : ce qu'ils sont, et comment on les raconte.
//
// À part du moteur, et pour une raison précise : l'écran commun a besoin de
// savoir à quoi ressemble un joker pour l'afficher, mais pas de savoir les
// résoudre. Importer `engine.js` depuis la télé y ferait entrer l'animateur,
// donc la synthèse vocale et le contexte audio — sur une page qui ne parle
// pas. Ce module-ci ne dépend de rien.
//
// `engine.js` réexporte tout ce qui suit : les appelants d'avant n'ont rien à
// changer.

export const JOKERS = [
  {
    id: 'double', nom: 'Quitte ou double', emoji: '🎲',
    court: 'Le double, ou la moitié en moins',
    desc: 'Sans faute : points doublés. Sinon tu perds la moitié de la mise, au prorata de ce que tu as raté — une rafale à quatre sur cinq ne coûte presque rien.',
  },
  {
    id: 'vol', nom: 'Vol', emoji: '🥷',
    court: 'Prend la moitié des points du leader',
    desc: 'Si tu as bon, tu prends la moitié des points que le leader gagne sur cette manche.',
  },
  {
    id: 'sabotage', nom: 'Sabotage', emoji: '🧨',
    court: 'Le leader ne marque rien',
    desc: 'Si tu as bon, le leader ne marque rien du tout sur cette manche.',
  },
  {
    id: 'sangfroid', nom: 'Sang-froid', emoji: '🧊',
    court: 'Le maximum, sans courir',
    desc: 'Prends tout ton temps : tu marques le maximum de points, comme si tu avais répondu du tac au tac.',
  },
  {
    id: 'cinquante', nom: '50/50', emoji: '✂️',
    court: 'Deux réponses en moins, points divisés',
    desc: 'Deux mauvaises réponses disparaissent — mais tes points de la manche sont divisés par deux.',
  },
];

/** Les jokers qu'un type de manche peut accueillir. */
export function jokersPossibles(type) {
  // Le 50/50 n'a rien à retirer ailleurs que sur un QCM : sur une estimation ou
  // une rafale, il n'y a pas de mauvaises réponses à masquer.
  return JOKERS.filter((j) => j.id !== 'cinquante' || type === 'qcm').map((j) => j.id);
}

/** Les jokers qui se jouent sur quelqu'un d'autre. */
export const AVEC_CIBLE = ['vol', 'sabotage'];

export const jokerDe = (id) => JOKERS.find((j) => j.id === id) ?? null;

/**
 * Ce qu'un joueur a dégainé cette manche, en une ligne lisible.
 *
 * Rend `null` quand il n'y a rien à dire, et sinon `{ emoji, texte, abouti }` —
 * « a volé 220 points à Bob », « visait Bob, et s'est raté ». C'est la réponse
 * à la question que toute la table pose à la révélation : qui m'a fait ça ?
 *
 * Les répliques enregistrées de l'animateur ne peuvent nommer personne — elles
 * disent « le leader » — donc cette ligne-ci est le seul endroit où le nom de
 * la victime apparaît à coup sûr.
 */
export function coupDeJoker(detail, nomDe) {
  const joker = jokerDe(detail?.joker);
  if (!joker) return null;

  if (!AVEC_CIBLE.includes(joker.id)) {
    return { emoji: joker.emoji, texte: joker.nom, abouti: true };
  }

  // La cible retenue par le moteur s'il a abouti, sinon celle qui était visée :
  // un joker dépensé pour rien reste une intention, et c'est souvent l'intention
  // qui fait rire.
  const victime = detail.cible ?? detail.cibleVisee;
  const nom = victime ? nomDe(victime) : null;
  const abouti = Boolean(detail.cible);

  if (!nom) return { emoji: joker.emoji, texte: `${joker.nom} — sans cible`, abouti: false };

  if (!abouti) {
    return { emoji: joker.emoji, texte: `visait ${nom}, sans succès`, abouti: false };
  }
  if (joker.id === 'vol') {
    return { emoji: joker.emoji, texte: `a volé ${detail.vol ?? 0} pts à ${nom}`, abouti: true };
  }
  return { emoji: joker.emoji, texte: `a saboté ${nom}`, abouti: true };
}
