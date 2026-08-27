// La rafale : cinq affirmations, vrai ou faux, dans la même manche.
//
// Elle sert le rythme plus que le savoir. Au milieu d'une partie, cinq
// jugements rapides d'affilée font monter le ton d'un cran, et le barème plat
// — un point par bonne réponse, sans prime à la vitesse — évite que ça devienne
// une course au tapotage aveugle.
//
// Les cinq affirmations s'affichent d'un coup plutôt qu'en séquence : un
// enchaînement minuté demanderait un sous-chrono par affirmation, donc un état
// supplémentaire à publier et à resynchroniser. À cinq boutons sur un écran, on
// obtient déjà la bousculade recherchée.

export default {
  id: 'rafale',
  nom: 'Rafale',
  emoji: '⚡',
  consigne: 'Vrai ou faux, les cinq d’affilée.',
  facteurDuree: 2,
  // Barème plat : ce qui compte, c'est le nombre de bonnes, pas la gâchette.
  poidsVitesse: 0,

  preparer(entree, melanger) {
    const ordre = melanger(entree.affirmations.map((_, i) => i));
    const affirmations = ordre.map((i) => entree.affirmations[i]);
    return {
      id: entree.id,
      type: 'rafale',
      theme: entree.theme,
      texte: entree.texte,
      note: entree.note,
      affirmations: affirmations.map((a) => a.texte),
      solution: affirmations.map((a) => Boolean(a.vrai)),
    };
  },

  publier(manche, revele) {
    return {
      affirmations: manche.affirmations,
      ...(revele ? { solution: manche.solution } : {}),
    };
  },

  lire(brut) {
    if (!Array.isArray(brut) || brut.length !== 5) return null;
    // `null` est une valeur légitime : on peut sauter une affirmation, et elle
    // compte simplement comme fausse au décompte.
    return brut.map((v) => (v === true || v === false ? v : null));
  },

  noter(manche, reponses) {
    const notes = {};
    for (const [id, r] of Object.entries(reponses)) {
      const justes = manche.solution.filter((attendu, i) => r.valeur[i] === attendu).length;
      notes[id] = {
        correct: justes === manche.solution.length,
        fraction: justes / manche.solution.length,
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
    const vraies = manche.affirmations.filter((_, i) => manche.solution[i]);
    if (!vraies.length) return 'Aucune n’était vraie.';
    if (vraies.length === manche.affirmations.length) return 'Toutes étaient vraies.';
    return `Étaient vraies : ${vraies.join(' ; ')}.`;
  },
};
