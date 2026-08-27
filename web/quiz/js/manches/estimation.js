// L'estimation : une question chiffrée, chacun avance un nombre.
//
// C'est le type qui change le plus le rythme d'une soirée. Sur un QCM, on
// dégaine ; ici on réfléchit, on hésite, on négocie à voix haute avec son
// voisin — et personne ne peut trouver par élimination. La rapidité ne rapporte
// donc rien : elle ne sert qu'à départager deux estimations identiques.

/** Écart relatif, borné : au-delà, la réponse ne vaut plus rien. */
const TOLERANCE = 0.5;

function ecartRelatif(donnee, attendue) {
  return Math.abs(donnee - attendue) / Math.max(1, Math.abs(attendue));
}

export default {
  id: 'estimation',
  nom: 'Estimation',
  emoji: '📏',
  consigne: 'Le plus proche gagne.',
  // Taper un nombre prend plus de temps que toucher un bouton.
  facteurDuree: 1.4,
  // Zéro : c'est la justesse qui paie, pas la gâchette.
  poidsVitesse: 0,

  preparer(entree) {
    return {
      id: entree.id,
      type: 'estimation',
      theme: entree.theme,
      texte: entree.texte,
      note: entree.note,
      valeur: entree.valeur,
      unite: entree.unite ?? '',
    };
  },

  publier(manche, revele) {
    return {
      unite: manche.unite,
      ...(revele ? { valeur: manche.valeur } : {}),
    };
  },

  lire(brut) {
    const nombre = Number(brut);
    return Number.isFinite(nombre) ? nombre : null;
  },

  /**
   * Deux barèmes qui se cumulent, et c'est ce qui rend la manche vivante :
   *
   * - être dans le voisinage rapporte déjà, proportionnellement à la justesse,
   *   pour que personne ne reparte bredouille sur une question difficile ;
   * - être LE plus proche rapporte le maximum, promesse tenue du « le plus
   *   proche gagne ». À égalité parfaite, c'est le plus rapide qui l'emporte —
   *   le seul endroit où le chrono compte encore.
   */
  noter(manche, reponses) {
    const notes = {};
    const entrees = Object.entries(reponses);
    if (!entrees.length) return notes;

    let meilleur = null;
    for (const [id, r] of entrees) {
      const ecart = Math.abs(r.valeur - manche.valeur);
      const plusProche = !meilleur
        || ecart < meilleur.ecart
        || (ecart === meilleur.ecart && r.elapsedMs < meilleur.elapsedMs);
      if (plusProche) meilleur = { id, ecart, elapsedMs: r.elapsedMs };
    }

    for (const [id, r] of entrees) {
      const relatif = ecartRelatif(r.valeur, manche.valeur);
      const proximite = Math.max(0, 1 - relatif / TOLERANCE);
      const gagnant = id === meilleur.id;
      notes[id] = {
        correct: gagnant,
        // Le vainqueur touche le plein tarif même si son estimation était loin :
        // sur une question où tout le monde se trompe, quelqu'un a quand même
        // été le moins mauvais, et ça mérite la manche.
        fraction: gagnant ? 1 : proximite,
        ecart: r.valeur - manche.valeur,
      };
    }
    return notes;
  },

  // « Personne n'a trouvé » n'a aucun sens ici : quelqu'un est forcément le
  // plus proche. L'animateur a donc sa propre réplique pour ce type.
  cleCommentaire(notes) {
    return notes.length ? 'plusProche' : 'personne';
  },

  solutionTexte(manche) {
    return `${manche.valeur}${manche.unite ? ` ${manche.unite}` : ''}`;
  },
};
