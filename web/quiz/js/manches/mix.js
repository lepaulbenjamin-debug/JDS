// Le mix : un thème, une réponse libre, et la course à celui qui trouve.
//
// C'est le fonctionnement de DJ Set transposé : le thème est annoncé (« une
// chanson avec un animal dans le titre »), tout le monde cherche en même temps,
// et le premier à sortir un titre valable rafle la manche.
//
// Ce qui change des autres types : il n'y a pas UNE bonne réponse mais une
// liste, et deux joueurs peuvent avoir raison en même temps sans dire la même
// chose. D'où deux règles qui n'existent nulle part ailleurs dans le jeu :
//
//   - toute proposition reconnue marque, pas seulement la première — sinon
//     quatre joueurs sur cinq repartent bredouilles à chaque manche, et taper
//     un titre au clavier prend déjà bien plus de temps que de le crier ;
//   - un titre déjà cité ne compte plus. Le plus rapide se l'approprie, et les
//     suivants doivent trouver autre chose. C'est ce qui empêche la table de
//     converger vers l'évidence et force à fouiller.
//
// La rapidité garde tout son poids : le premier marque le plus, comme dans le
// jeu de plateau où il n'y a qu'une carte à gagner par extrait.
//
// La limite, elle, est assumée : l'appli juge sur une liste, elle ne connaît
// pas toute la musique du monde. La révélation affiche donc ce qu'elle
// acceptait — c'est le moment où la table découvre les vingt titres auxquels
// personne n'avait pensé, et c'est une bonne minute de soirée.

/** Forme comparable d'un titre : sans accent, sans ponctuation, en minuscules. */
export const normaliser = (texte) => String(texte ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const echapper = (texte) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * La proposition d'un joueur correspond-elle à un titre de la liste ?
 *
 * Deux façons de reconnaître, et la seconde est volontairement généreuse :
 * personne ne tape « Eye of the Tiger » en entier avec un verre dans l'autre
 * main. Un fragment suffit — « tiger » passe — mais sous deux conditions, et
 * chacune écarte une façon de marquer sans rien avoir trouvé :
 *
 *   - le fragment doit couvrir des mots ENTIERS du titre. Sans quoi « ackbird »
 *     ramasserait « Blackbird », ce qui n'est pas une réponse mais une faute de
 *     frappe heureuse ;
 *   - il doit contenir au moins un mot de cinq lettres. Sans quoi « of the »,
 *     qui ne désigne rien, raflerait le premier titre de la liste où ces deux
 *     mots se suivent.
 */
export function reconnu(acceptees, propose) {
  const propre = normaliser(propose);
  if (!propre) return null;

  const exact = acceptees.find((t) => normaliser(t.titre) === propre);
  if (exact) return exact;

  const porteur = propre.split(' ').some((mot) => mot.length >= 5);
  if (!porteur) return null;

  const motsEntiers = new RegExp(`(^| )${echapper(propre)}( |$)`);
  return acceptees.find((t) => motsEntiers.test(normaliser(t.titre))) ?? null;
}

export default {
  id: 'mix',
  nom: 'Le mix',
  emoji: '🎚️',
  consigne: 'Cite un titre qui colle. Le premier marque le plus.',
  // Écrire un titre prend plus de temps que toucher un bouton, et il faut
  // d'abord le chercher dans sa tête.
  facteurDuree: 1.8,
  // Plein poids : c'est une course, c'est tout l'intérêt.
  poidsVitesse: 1,

  preparer(entree) {
    return {
      id: entree.id,
      type: 'mix',
      theme: entree.theme,
      texte: entree.texte,
      note: entree.note,
      acceptees: entree.acceptees,
    };
  },

  publier(manche, revele) {
    // Rien pendant la manche : la liste EST la réponse. Elle ne part qu'à la
    // révélation, où elle devient le morceau de bravoure de l'animateur.
    return revele ? { acceptees: manche.acceptees } : {};
  },

  lire(brut) {
    if (typeof brut !== 'string') return null;
    const propre = brut.trim().slice(0, 80);
    return propre || null;
  },

  noter(manche, reponses) {
    const notes = {};
    // Dans l'ordre d'arrivée : c'est le plus rapide qui s'approprie un titre.
    const entrees = Object.entries(reponses)
      .sort((a, b) => (a[1].elapsedMs ?? 0) - (b[1].elapsedMs ?? 0));

    const pris = new Set();
    for (const [id, r] of entrees) {
      const trouve = reconnu(manche.acceptees, r.valeur);
      if (!trouve) {
        notes[id] = { correct: false, fraction: 0, titre: null };
        continue;
      }
      const cle = normaliser(trouve.titre);
      if (pris.has(cle)) {
        notes[id] = { correct: false, fraction: 0, titre: trouve.titre, dejaCite: true };
        continue;
      }
      pris.add(cle);
      notes[id] = { correct: true, fraction: 1, titre: trouve.titre };
    }
    return notes;
  },

  /**
   * « La bonne réponse était… » n'a aucun sens ici : il y en a vingt. L'annonce
   * dit donc combien de titres ont été trouvés, et enchaîne sur la liste.
   */
  cleCommentaire(notes) {
    return notes.some((n) => n.correct) ? 'mixTrouve' : 'mixPersonne';
  },

  solutionTexte(manche) {
    // L'animateur ne peut pas lire vingt titres : il en donne trois, la liste
    // complète s'affiche à l'écran.
    return manche.acceptees.slice(0, 3).map((t) => t.titre).join(', ');
  },
};
