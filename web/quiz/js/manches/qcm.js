// La manche classique : une question, quatre réponses, le plus rapide marque le
// plus. C'est le rythme de référence auquel les autres types se comparent.

export default {
  id: 'qcm',
  nom: 'Question',
  emoji: '❓',
  consigne: 'Une seule bonne réponse.',
  facteurDuree: 1,
  poidsVitesse: 1,

  preparer(entree, melanger) {
    // La banque garde la bonne réponse en première position — une liste relue à
    // l'œil se vérifie mieux qu'une liste où il faut compter les index. Le
    // mélange se fait ici, une fois par partie et par question.
    const ordre = melanger(entree.reponses.map((_, i) => i));
    return {
      id: entree.id,
      type: 'qcm',
      theme: entree.theme,
      texte: entree.texte,
      note: entree.note,
      reponses: ordre.map((i) => entree.reponses[i]),
      bonne: ordre.indexOf(entree.bonne),
    };
  },

  publier(manche, revele) {
    return {
      reponses: manche.reponses,
      ...(revele ? { bonne: manche.bonne } : {}),
    };
  },

  lire(brut) {
    return Number.isInteger(brut) && brut >= 0 && brut < 4 ? brut : null;
  },

  noter(manche, reponses) {
    const notes = {};
    for (const [id, r] of Object.entries(reponses)) {
      const correct = r.valeur === manche.bonne;
      notes[id] = { correct, fraction: correct ? 1 : 0 };
    }
    return notes;
  },

  solutionTexte(manche) {
    return manche.reponses[manche.bonne];
  },
};
