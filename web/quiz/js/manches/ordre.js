// La manche de classement : quatre éléments à remettre dans le bon ordre.
//
// Points au nombre de positions justes, donc on marque même en se trompant à
// moitié. C'est délibéré : une manche tout ou rien sur quatre éléments serait
// perdue par presque tout le monde, et une manche que personne ne gagne
// n'apporte rien à une soirée.

export default {
  id: 'ordre',
  nom: 'Dans l’ordre',
  emoji: '🔢',
  consigne: 'Touchez-les dans le bon ordre.',
  // Quatre taps réfléchis, contre un seul sur un QCM.
  facteurDuree: 1.6,
  // La justesse prime, mais la rapidité garde son mot à dire.
  poidsVitesse: 0.5,

  preparer(entree, melanger) {
    // `elements` est donné dans le bon ordre ; on l'affiche mélangé et on note
    // où chaque élément a atterri, pour pouvoir comparer les positions.
    const ordre = melanger(entree.elements.map((_, i) => i));
    return {
      id: entree.id,
      type: 'ordre',
      theme: entree.theme,
      texte: entree.texte,
      note: entree.note,
      elements: ordre.map((i) => entree.elements[i]),
      // La solution en positions d'affichage : `solution[0]` est l'élément
      // affiché qui doit venir en premier.
      solution: entree.elements.map((_, rang) => ordre.indexOf(rang)),
    };
  },

  publier(manche, revele) {
    return {
      elements: manche.elements,
      ...(revele ? { solution: manche.solution } : {}),
    };
  },

  lire(brut) {
    if (!Array.isArray(brut) || brut.length !== 4) return null;
    const propre = brut.map((n) => (Number.isInteger(n) ? n : -1));
    // Une permutation, pas n'importe quelle liste : sans ça, répondre
    // « 0,0,0,0 » décrocherait une position juste à coup sûr.
    if (new Set(propre).size !== 4) return null;
    if (propre.some((n) => n < 0 || n > 3)) return null;
    return propre;
  },

  noter(manche, reponses) {
    const notes = {};
    for (const [id, r] of Object.entries(reponses)) {
      const justes = r.valeur.filter((element, rang) => element === manche.solution[rang]).length;
      notes[id] = {
        correct: justes === 4,
        fraction: justes / 4,
        justes,
      };
    }
    return notes;
  },

  // Le sans-faute est rare sur ce type ; annoncer « personne n'a trouvé » alors
  // que la moitié de la table a marqué des points serait faux.
  cleCommentaire(notes) {
    if (notes.some((n) => n.correct)) {
      return notes.filter((n) => n.correct).length === 1 ? 'unSeul' : 'plusieurs';
    }
    return notes.some((n) => n.fraction > 0) ? 'partiel' : 'personne';
  },

  solutionTexte(manche) {
    return manche.solution.map((i) => manche.elements[i]).join(', puis ');
  },
};
